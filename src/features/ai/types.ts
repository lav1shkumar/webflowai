/**
 * WebFlowAI multi-agent type system.
 *
 * The generation pipeline is a directed flow of specialized agents:
 *
 *   Planner → Architect → Code Generator → File Operation → Reviewer
 *
 * Every agent implements {@link Agent} so the orchestrator can run, trace,
 * and stream them uniformly. Agents are intentionally pure with respect to
 * I/O: they receive a context and return a typed result plus emitted events.
 */

export type AgentKind =
  | "planner"
  | "architect"
  | "generator"
  | "file-operation"
  | "reviewer";

export type AgentPhase =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

/** A single file change the pipeline intends to apply. */
export interface FileChange {
  path: string;
  /** "create" | "update" | "delete" */
  op: "create" | "update" | "delete";
  content?: string;
  language?: string;
}

/** One unit of planned work produced by the Planner. */
export interface PlanStep {
  id: string;
  title: string;
  description: string;
  /** Which agent is responsible for executing this step. */
  agent: AgentKind;
  /** Step ids that must complete first. */
  dependsOn: string[];
}

export interface ExecutionPlan {
  summary: string;
  steps: PlanStep[];
  /** High-level user-facing intent classification. */
  intent: "create" | "modify" | "refactor" | "explain" | "debug" | "feature";
}

/** Architect output: the resolved project blueprint. */
export interface ProjectBlueprint {
  framework: string;
  description: string;
  directories: string[];
  /** Files the architect expects to exist, with a one-line purpose each. */
  files: { path: string; purpose: string }[];
  dependencies: Record<string, string>;
}

/** Reviewer verdict over a set of changes. */
export interface ReviewResult {
  approved: boolean;
  score: number; // 0..100
  issues: ReviewIssue[];
  summary: string;
}

export interface ReviewIssue {
  severity: "info" | "warning" | "error";
  path?: string;
  message: string;
}

/** A tool invocation surfaced to the UI (e.g. the agent reading a file). */
export type ToolName = "list_files" | "read_file" | "search_files";

/** Streamed event emitted by any agent for live UI rendering. */
export type AgentEvent =
  | { type: "phase"; agent: AgentKind; phase: AgentPhase }
  | { type: "log"; agent: AgentKind; message: string }
  | { type: "token"; agent: AgentKind; text: string }
  | { type: "file"; agent: AgentKind; change: FileChange }
  | { type: "plan"; plan: ExecutionPlan }
  | { type: "blueprint"; blueprint: ProjectBlueprint }
  | { type: "review"; review: ReviewResult }
  | {
      type: "tool";
      agent: AgentKind;
      tool: ToolName;
      detail: string;
    }
  | { type: "error"; agent: AgentKind; message: string };

/** Shared, mutable context threaded through the pipeline. */
export interface AgentContext {
  projectId: string;
  /** The user's natural-language instruction for this turn. */
  prompt: string;
  /** Existing files in the workspace, keyed by path. */
  files: Record<string, string>;
  /** Conversation history for grounding. */
  history: { role: "user" | "assistant"; content: string }[];
  /** Accumulated artifacts from earlier agents. */
  plan?: ExecutionPlan;
  blueprint?: ProjectBlueprint;
  changes: FileChange[];
  review?: ReviewResult;
  /** Running total of model tokens consumed across all agents this turn. */
  usage: { tokens: number };
  /** Sink for streamed events. */
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

export interface AgentResult {
  kind: AgentKind;
  ok: boolean;
  /** Free-form structured output, narrowed by each agent. */
  output?: unknown;
  error?: string;
  tokensUsed?: number;
}

/** The uniform contract every agent satisfies. */
export interface Agent<TOutput = unknown> {
  readonly kind: AgentKind;
  readonly name: string;
  readonly description: string;
  run(ctx: AgentContext): Promise<AgentResult & { output?: TOutput }>;
}
