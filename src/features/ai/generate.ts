import { streamText, stepCountIs } from "ai";
import { getModel, modelDefaults } from "./model";
import { createWorkspaceTools } from "./tools";
import { verifyWorkspace, formatIssues } from "./verifier";
import { buildPrompt, buildFixPrompt } from "./prompts";
import { parseFileBlocks } from "./parser";
import type { FileChange, ToolContext } from "./types";

/**
 * The core generation pipeline. Takes a user prompt and existing files,
 * calls the LLM to generate/modify code, verifies the result, and runs
 * fix passes if there are errors.
 *
 * This is the only place in the app that talks to the AI model.
 * Prompt templates live in ./prompts and response parsing in ./parser.
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
  const allChanges: FileChange[] = [];
  let totalTokens = 0;

  // Main generation pass.
  onLog?.("Generating code…");
  const main = await callModel({
    prompt: buildPrompt(prompt, files),
    files,
    signal,
    onToken,
    onFileChange,
  });
  totalTokens += main.tokens;
  applyChanges(files, main.changes);
  allChanges.push(...main.changes);

  // Verify, then fix any errors (bounded by maxFixAttempts).
  for (let attempt = 1; attempt <= maxFixAttempts; attempt++) {
    const verification = await verifyWorkspace(files);
    if (verification.ok) break;

    const errorCount = verification.issues.filter(
      (i) => i.severity === "error",
    ).length;
    onLog?.(`Found ${errorCount} issue(s), fixing (attempt ${attempt}/${maxFixAttempts})…`);

    const fix = await callModel({
      prompt: buildFixPrompt(prompt, files, formatIssues(verification)),
      files,
      signal,
      onToken,
      onFileChange,
    });
    totalTokens += fix.tokens;
    applyChanges(files, fix.changes);
    allChanges.push(...fix.changes);
  }

  onLog?.(`Done — ${allChanges.length} file(s) changed.`);

  return { ok: true, files, changes: allChanges, tokens: totalTokens };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ModelResult {
  changes: FileChange[];
  tokens: number;
}

/** One round-trip to the model: stream the response, emit files as they close. */
async function callModel(opts: {
  prompt: string;
  files: Record<string, string>;
  signal?: AbortSignal;
  onToken?: (text: string) => void;
  onFileChange?: (change: FileChange) => void;
}): Promise<ModelResult> {
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
  const emitted = new Set<string>();

  // Emit any newly-completed file blocks to the UI.
  const emitNewFiles = () => {
    for (const change of parseFileBlocks(buffer, opts.files)) {
      if (emitted.has(change.path)) continue;
      emitted.add(change.path);
      opts.onFileChange?.(change);
    }
  };

  for await (const delta of result.textStream) {
    buffer += delta;
    opts.onToken?.(delta);
    // Only re-parse when a fence arrives — that's the only time a block can
    // close. Avoids re-parsing the whole buffer on every token.
    if (opts.onFileChange && delta.includes("```")) emitNewFiles();
  }

  // Final pass in case a closing fence was split across chunks.
  if (opts.onFileChange) emitNewFiles();

  const usage = await result.usage;
  return {
    changes: parseFileBlocks(buffer, opts.files),
    tokens: usage?.totalTokens ?? 0,
  };
}

/** Apply a set of changes to the in-memory file map. */
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
