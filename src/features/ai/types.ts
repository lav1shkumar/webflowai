/**
 * Core types for the AI generation pipeline.
 */

export type AgentKind = "generator";

export type AgentPhase = "running" | "succeeded" | "failed";

/** A single file change produced by generation. */
export interface FileChange {
  path: string;
  op: "create" | "update" | "delete";
  content?: string;
  language?: string;
}

/** Reviewer verdict (simplified). */
export interface ReviewResult {
  approved: boolean;
  score: number;
  issues: { severity: string; path?: string; message: string }[];
  summary: string;
}

/** A tool invocation surfaced to the UI. */
export type ToolName = "list_files" | "read_file" | "search_files";

/** Streamed event emitted during generation for live UI updates. */
export type AgentEvent =
  | { type: "phase"; agent: AgentKind; phase: AgentPhase }
  | { type: "log"; agent: AgentKind; message: string }
  | { type: "token"; agent: AgentKind; text: string }
  | { type: "file"; agent: AgentKind; change: FileChange }
  | { type: "review"; review: ReviewResult }
  | { type: "tool"; agent: AgentKind; tool: ToolName; detail: string }
  | { type: "error"; agent: AgentKind; message: string };

/**
 * Minimal context passed to workspace tools so they can read files.
 * (Used internally by the tools module.)
 */
export interface ToolContext {
  projectId: string;
  prompt: string;
  files: Record<string, string>;
  history: { role: "user" | "assistant"; content: string }[];
  changes: FileChange[];
  usage: { tokens: number };
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
}
