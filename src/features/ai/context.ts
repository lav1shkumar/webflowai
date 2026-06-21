import { languageFromPath } from "../webcontainer/files";

/**
 * Context engineering for the agent pipeline.
 *
 * The model can only reason about code it can see. This module turns the
 * in-memory workspace (a flat path→content map) into compact, high-signal
 * context strings that fit a bounded budget:
 *
 *   - {@link buildRepoMap}      a directory listing (paths, language, size)
 *   - {@link rankFilesByRelevance} relevance-ordered file paths for a request
 *   - {@link packFileContents}   full file contents, budget-bounded + ordered
 *
 * Everything is pure and deterministic so prompts stay testable and stable.
 */

/** Approx. characters of file content to inline across the whole prompt. */
export const TOTAL_CONTEXT_CHARS = 60_000;
/** Hard per-file cap so one large file can't crowd out the rest. */
export const PER_FILE_CHARS = 16_000;
/** Rough chars→token ratio for human-readable budget reporting. */
const CHARS_PER_TOKEN = 4;

/** Files that anchor a project; always ranked first when present. */
const ENTRY_FILES = [
  "package.json",
  "index.html",
  "src/main.tsx",
  "src/main.ts",
  "src/App.tsx",
  "src/App.ts",
  "vite.config.ts",
  "tsconfig.json",
];

/** Noise that rarely helps the model and wastes budget. */
const IGNORED_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp4|pdf)$/i,
];

function isIgnored(path: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(path));
}

/** Project files worth showing the model (excludes lockfiles, binaries, …). */
export function relevantPaths(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((p) => !isIgnored(p))
    .sort();
}

/** Estimate token count from character length. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * A compact repository map: one line per file with language + byte size.
 * Cheap to include in every prompt so the model always knows what exists.
 */
export function buildRepoMap(files: Record<string, string>): string {
  const paths = relevantPaths(files);
  if (paths.length === 0) return "(empty project — no files yet)";
  return paths
    .map((p) => {
      const size = files[p]?.length ?? 0;
      return `- ${p} · ${languageFromPath(p)} · ${size} bytes`;
    })
    .join("\n");
}

/** Split a request into lowercase keyword tokens for relevance scoring. */
function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2),
    ),
  );
}

/**
 * Rank files by likely relevance to a natural-language request.
 *
 * Scoring blends: entry-file anchoring, keyword hits in the path (high weight)
 * and in the content (low weight, capped), with a mild penalty for very large
 * files. Returns paths sorted most-relevant first. Deterministic.
 */
export function rankFilesByRelevance(
  files: Record<string, string>,
  prompt: string,
): string[] {
  const keywords = tokenize(prompt);
  const paths = relevantPaths(files);

  const score = (path: string): number => {
    const content = files[path] ?? "";
    const lowerPath = path.toLowerCase();
    const lowerContent = content.toLowerCase();
    let s = 0;

    const entryIdx = ENTRY_FILES.indexOf(path);
    if (entryIdx >= 0) s += 12 - entryIdx; // earlier anchors weigh more

    for (const kw of keywords) {
      if (lowerPath.includes(kw)) s += 6;
      // count content hits, capped to avoid runaway weighting
      const hits = lowerContent.split(kw).length - 1;
      s += Math.min(hits, 5);
    }

    // mild large-file penalty (keeps focused files ahead of dumps)
    if (content.length > PER_FILE_CHARS) s -= 2;
    return s;
  };

  return paths
    .map((path) => ({ path, s: score(path) }))
    .sort((a, b) => b.s - a.s || a.path.localeCompare(b.path))
    .map((e) => e.path);
}

export interface PackedContext {
  /** Concatenated, fenced file contents that fit the budget. */
  body: string;
  /** Paths that were fully included. */
  included: string[];
  /** Paths omitted for budget reasons (available via the read_file tool). */
  omitted: string[];
  /** Approx token count of {@link body}. */
  tokens: number;
}

/** Render a single file as a labeled, fenced block (truncating if needed). */
function renderFile(path: string, content: string): string {
  const lang = languageFromPath(path);
  let body = content;
  let note = "";
  if (body.length > PER_FILE_CHARS) {
    body = body.slice(0, PER_FILE_CHARS);
    note = `\n… [truncated ${content.length - PER_FILE_CHARS} chars — use the read_file tool for the full file]`;
  }
  return `\`\`\`${lang} path=${path}\n${body}${note}\n\`\`\``;
}

/**
 * Pack as many full file contents as fit within {@link TOTAL_CONTEXT_CHARS},
 * ordered by relevance to {@link prompt}. Files that don't fit are listed as
 * {@link PackedContext.omitted} so the prompt can tell the model to fetch them
 * on demand via the `read_file` tool.
 */
export function packFileContents(
  files: Record<string, string>,
  prompt: string,
  budgetChars: number = TOTAL_CONTEXT_CHARS,
): PackedContext {
  const ordered = rankFilesByRelevance(files, prompt);
  const blocks: string[] = [];
  const included: string[] = [];
  const omitted: string[] = [];
  let used = 0;

  for (const path of ordered) {
    const content = files[path] ?? "";
    const rendered = renderFile(path, content);
    if (used + rendered.length > budgetChars && included.length > 0) {
      omitted.push(path);
      continue;
    }
    blocks.push(rendered);
    included.push(path);
    used += rendered.length + 1;
  }

  return {
    body: blocks.join("\n\n"),
    included,
    omitted,
    tokens: estimateTokens(blocks.join("\n\n")),
  };
}

/**
 * Build the standard "current codebase" context section for a prompt: a repo
 * map plus packed file contents, with a pointer to the read_file tool for any
 * omitted files. Returns an empty-project notice when there are no files.
 */
export function buildCodebaseContext(
  files: Record<string, string>,
  prompt: string,
  budgetChars: number = TOTAL_CONTEXT_CHARS,
): string {
  const paths = relevantPaths(files);
  if (paths.length === 0) {
    return "CURRENT CODEBASE: (empty — this is a brand-new project with no files yet).";
  }

  const packed = packFileContents(files, prompt, budgetChars);
  const omittedNote =
    packed.omitted.length > 0
      ? `\n\nNot inlined (call the read_file tool to view any of these):\n${packed.omitted
          .map((p) => `- ${p}`)
          .join("\n")}`
      : "";

  return `CURRENT CODEBASE — repository map (${paths.length} files):
${buildRepoMap(files)}

FILE CONTENTS (most relevant first):
${packed.body}${omittedNote}`;
}
