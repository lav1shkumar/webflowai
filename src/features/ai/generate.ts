import { streamText, stepCountIs } from "ai";
import { getModel, modelDefaults } from "./model";
import { createWorkspaceTools } from "./tools";
import { buildPrompt } from "./prompts";
import { parseFileBlocks } from "./parser";
import type { FileChange } from "./types";

/**
 * The core generation pipeline. Takes a user prompt and existing files,
 * calls the model, and streams generated file changes back to the workspace.
 *
 * This is the only place in the app that talks to the AI model.
 * Prompt templates live in ./prompts and response parsing in ./parser.
 */

export interface GenerateInput {
  prompt: string;
  files: Record<string, string>;
  signal?: AbortSignal;
  onFileChange?: (change: FileChange) => void;
  onLog?: (message: string) => void;
}

export interface GenerateResult {
  changes: FileChange[];
  tokens: number;
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  input.onLog?.("Generating code…");
  const result = await callModel({
    prompt: buildPrompt(input.prompt, input.files),
    files: input.files,
    signal: input.signal,
    onFileChange: input.onFileChange,
  });
  input.onLog?.(`Done — ${result.changes.length} file(s) changed.`);
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** One round-trip to the model: stream the response, emit files as they close. */
async function callModel(opts: {
  prompt: string;
  files: Record<string, string>;
  signal?: AbortSignal;
  onFileChange?: (change: FileChange) => void;
}): Promise<GenerateResult> {
  const result = streamText({
    model: getModel(),
    prompt: opts.prompt,
    tools: createWorkspaceTools(opts.files),
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
