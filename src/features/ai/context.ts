import { languageFromPath } from "../webcontainer/files";

/**
 * Turns the in-memory workspace (a flat path→content map) into the compact
 * "current codebase" text we drop into prompts: a repo map plus file contents,
 * bounded by a character budget. Pure and deterministic.
 */

/** Approx. characters of file content to inline across the whole prompt. */
export const TOTAL_CONTEXT_CHARS = 60_000;
/** Hard per-file cap so one large file can't crowd out the rest. */
export const PER_FILE_CHARS = 16_000;

/** Anchor files shown first when present. */
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

/** Project files worth showing the model (excludes lockfiles, binaries, …). */
export function relevantPaths(files: Record<string, string>): string[] {
  const paths: string[] = [];
  for (const path of Object.keys(files)) {
    let ignored = false;
    for (const re of IGNORED_PATTERNS) {
      if (re.test(path)) {
        ignored = true;
        break;
      }
    }
    if (!ignored) paths.push(path);
  }
  return paths.sort();
}

/** One line per file: `path · language · size`. */
export function buildRepoMap(files: Record<string, string>): string {
  const paths = relevantPaths(files);
  if (paths.length === 0) return "(empty project — no files yet)";

  const lines: string[] = [];
  for (const path of paths) {
    const size = files[path]?.length ?? 0;
    lines.push(`- ${path} · ${languageFromPath(path)} · ${size} bytes`);
  }
  return lines.join("\n");
}

/** Render a file as a fenced block, truncating if it exceeds the per-file cap. */
function renderFile(path: string, content: string): string {
  let body = content;
  let note = "";
  if (body.length > PER_FILE_CHARS) {
    body = body.slice(0, PER_FILE_CHARS);
    note = `\n… [truncated ${content.length - PER_FILE_CHARS} chars — use the read_file tool for the full file]`;
  }
  return `\`\`\`${languageFromPath(path)} path=${path}\n${body}${note}\n\`\`\``;
}

/**
 * Build the "current codebase" context section: a repo map plus file contents
 * (anchor files first, then alphabetical) packed until the budget runs out.
 * Files that don't fit are listed so the model can fetch them via read_file.
 */
export function buildCodebaseContext(
  files: Record<string, string>,
  budgetChars: number = TOTAL_CONTEXT_CHARS,
): string {
  const paths = relevantPaths(files);
  if (paths.length === 0) {
    return "CURRENT CODEBASE: (empty — this is a brand-new project with no files yet).";
  }

  // Order: anchor files first (in declared order), then the rest alphabetically.
  const ordered: string[] = [];
  for (const entry of ENTRY_FILES) {
    if (paths.includes(entry)) ordered.push(entry);
  }
  for (const path of paths) {
    if (!ENTRY_FILES.includes(path)) ordered.push(path);
  }

  // Inline file contents until the budget runs out; collect the rest.
  const blocks: string[] = [];
  const omitted: string[] = [];
  let used = 0;
  for (const path of ordered) {
    const block = renderFile(path, files[path] ?? "");
    if (used + block.length > budgetChars && blocks.length > 0) {
      omitted.push(path);
      continue;
    }
    blocks.push(block);
    used += block.length + 2;
  }

  let omittedNote = "";
  if (omitted.length > 0) {
    const lines: string[] = [];
    for (const path of omitted) lines.push(`- ${path}`);
    omittedNote = `\n\nNot inlined (call the read_file tool to view any of these):\n${lines.join("\n")}`;
  }

  return `CURRENT CODEBASE — repository map (${paths.length} files):
${buildRepoMap(files)}

FILE CONTENTS:
${blocks.join("\n\n")}${omittedNote}`;
}
