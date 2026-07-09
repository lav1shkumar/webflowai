import { streamText, stepCountIs } from "ai";
import { getModel, modelDefaults } from "./model";
import { createWorkspaceTools } from "./tools";
import { verifyWorkspace, formatIssues } from "./verifier";
import { buildCodebaseContext } from "./context";
import { languageFromPath } from "../webcontainer/files";
import type { FileChange, ToolContext } from "./types";

/**
 * The core generation function. Takes a user prompt and existing files,
 * calls the LLM once to generate/modify code, then verifies the result
 * and optionally runs fix passes if there are errors.
 *
 * This is the only place in the app that talks to the AI model.
 */

export interface GenerateInput {
  projectId: string;
  prompt: string;
  files: Record<string, string>;
  history: { role: "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
  maxFixAttempts?: number;
  onToken?: (text: string) => void;
  onFileChange?: (change: FileChange) => void;
  onLog?: (message: string) => void;
}

export interface GenerateResult {
  ok: boolean;
  files: Record<string, string>;
  changes: FileChange[];
  tokens: number;
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const {
    prompt,
    files: inputFiles,
    signal,
    maxFixAttempts = 2,
    onToken,
    onFileChange,
    onLog,
  } = input;

  const files = { ...inputFiles };
  let totalTokens = 0;
  let allChanges: FileChange[] = [];

  // --- Main generation pass ---
  onLog?.("Generating code…");
  const mainChanges = await callModel({
    prompt: buildPrompt(prompt, files),
    files,
    signal,
    onToken,
  });
  totalTokens += mainChanges.tokens;

  applyChanges(files, mainChanges.changes);
  allChanges = mainChanges.changes;
  for (const change of mainChanges.changes) {
    onFileChange?.(change);
  }

  // --- Verify + fix loop ---
  for (let attempt = 0; attempt < maxFixAttempts; attempt++) {
    const verification = await verifyWorkspace(files);
    if (verification.ok) break;

    const errorCount = verification.issues.filter(
      (i) => i.severity === "error",
    ).length;
    onLog?.(`Found ${errorCount} issue(s), fixing (attempt ${attempt + 1}/${maxFixAttempts})…`);

    const fixChanges = await callModel({
      prompt: buildFixPrompt(prompt, files, formatIssues(verification)),
      files,
      signal,
      onToken,
    });
    totalTokens += fixChanges.tokens;

    applyChanges(files, fixChanges.changes);
    allChanges.push(...fixChanges.changes);
    for (const change of fixChanges.changes) {
      onFileChange?.(change);
    }
  }

  onLog?.(`Done — ${allChanges.length} file(s) changed.`);

  return {
    ok: true,
    files,
    changes: allChanges,
    tokens: totalTokens,
  };
}

// --- Internal helpers ---

interface ModelResult {
  changes: FileChange[];
  tokens: number;
}

async function callModel(opts: {
  prompt: string;
  files: Record<string, string>;
  signal?: AbortSignal;
  onToken?: (text: string) => void;
}): Promise<ModelResult> {
  // Build a minimal context for the workspace tools
  const toolCtx: ToolContext = {
    projectId: "",
    prompt: opts.prompt,
    files: opts.files,
    history: [],
    changes: [],
    usage: { tokens: 0 },
    emit: () => {},
    signal: opts.signal,
  };

  const result = streamText({
    model: getModel(),
    prompt: opts.prompt,
    tools: createWorkspaceTools(toolCtx, "generator"),
    stopWhen: stepCountIs(8),
    abortSignal: opts.signal,
    ...modelDefaults,
  });

  let buffer = "";
  for await (const delta of result.textStream) {
    buffer += delta;
    opts.onToken?.(delta);
  }

  const usage = await result.usage;
  const tokens = usage?.totalTokens ?? 0;
  const changes = parseFileBlocks(buffer, opts.files);

  return { changes, tokens };
}

function applyChanges(
  files: Record<string, string>,
  changes: FileChange[],
): void {
  for (const change of changes) {
    if (change.op === "delete") {
      delete files[change.path];
    } else {
      files[change.path] = change.content ?? "";
    }
  }
}

function buildPrompt(prompt: string, files: Record<string, string>): string {
  const isNew = Object.keys(files).length === 0;

  const mode = isNew
    ? `You are building a NEW app from scratch.
Create a Vite + React + TypeScript single-page app (runs in a WebContainer — no SSR/Next.js).
Include all required files: package.json, vite.config.ts, index.html, tsconfig.json, src/main.tsx, src/App.tsx, plus components as needed.
The "dev" script must be exactly: vite --host --port 3000`
    : `You are MODIFYING an existing codebase.
Make the smallest set of changes that fully satisfies the request.
Read files with the read_file tool before modifying them. Only emit files you change or create.`;

  return `You are WebFlowAI, an AI code generator. Write complete, production-quality code.

${mode}

TOOLS — you have read access to the workspace:
- list_files(): see all files in the project.
- read_file({ path }): read a file's contents.
- search_files({ query }): search across files.

${buildCodebaseContext(files, prompt)}

User request:
"""${prompt}"""

OUTPUT FORMAT — emit ONLY fenced code blocks, one per file:

\`\`\`tsx path=src/App.tsx
// full file contents here
\`\`\`

To delete a file:
\`\`\`delete path=src/Old.tsx
\`\`\`

Rules:
- Emit the COMPLETE contents of every file you create or change.
- Do NOT emit unchanged files.
- No commentary outside of code blocks.`;
}

function buildFixPrompt(
  prompt: string,
  files: Record<string, string>,
  issueReport: string,
): string {
  return `You are WebFlowAI. A verifier found errors in the code you generated. Fix EVERY error below with the smallest possible changes. Do not redesign or add features — only fix the issues.

ERRORS:
${issueReport}

TOOLS — you have read access to the workspace:
- list_files(): see all files.
- read_file({ path }): read a file.
- search_files({ query }): search files.

${buildCodebaseContext(files, prompt)}

Original request (for context only):
"""${prompt}"""

OUTPUT FORMAT — emit ONLY fenced code blocks for files you fix:
\`\`\`tsx path=src/App.tsx
// full corrected file contents
\`\`\``;
}

/**
 * Parse fenced file blocks from the model response.
 * Format: ```language path=relative/path\n...content...\n```
 */
function parseFileBlocks(
  text: string,
  existing: Record<string, string>,
): FileChange[] {
  const changes: FileChange[] = [];
  const seen = new Set<string>();
  const re = /```([a-z0-9]*)\s+path=([^\n]+)\n([\s\S]*?)```/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const lang = (match[1] ?? "").toLowerCase();
    const rawPath = match[2]?.trim().replace(/^["'`]|["'`]$/g, "");
    const content = match[3] ?? "";

    if (!rawPath || seen.has(rawPath)) continue;
    if (!isValidPath(rawPath)) continue;
    seen.add(rawPath);

    if (lang === "delete") {
      if (existing[rawPath] !== undefined) {
        changes.push({ path: rawPath, op: "delete" });
      }
      continue;
    }

    changes.push({
      path: rawPath,
      op: existing[rawPath] !== undefined ? "update" : "create",
      content,
      language: languageFromPath(rawPath),
    });
  }

  return changes;
}

function isValidPath(path: string): boolean {
  if (/[*?<>|]/.test(path)) return false;
  if (path.startsWith("/") || path.includes("..")) return false;
  if (path.length > 200) return false;
  return /\.[a-z0-9]+$/i.test(path) || !path.includes(" ");
}
