import { plannerAgent } from "./agents/planner";
import { architectAgent } from "./agents/architect";
import { generatorAgent } from "./agents/generator";
import { fileOperationAgent } from "./agents/file-operation";
import { reviewerAgent } from "./agents/reviewer";
import type {
  Agent,
  AgentContext,
  AgentEvent,
  AgentKind,
  FileChange,
} from "./types";

/** Registry of all agents, keyed by kind. Extensible by design. */
export const agentRegistry: Record<AgentKind, Agent> = {
  planner: plannerAgent,
  architect: architectAgent,
  generator: generatorAgent,
  "file-operation": fileOperationAgent,
  reviewer: reviewerAgent,
};

export interface OrchestratorInput {
  projectId: string;
  prompt: string;
  files?: Record<string, string>;
  history?: { role: "user" | "assistant"; content: string }[];
  emit?: (event: AgentEvent) => void;
  signal?: AbortSignal;
  /** Re-run generation+review if the reviewer rejects, up to N times. */
  maxReviewRetries?: number;
}

export interface OrchestratorResult {
  ok: boolean;
  files: Record<string, string>;
  changes: FileChange[];
  events: AgentEvent[];
  context: AgentContext;
  /** Total model tokens consumed across the whole pipeline this turn. */
  tokens: number;
}

/**
 * The Orchestrator runs the agent pipeline:
 *
 *   Planner → Architect → Generator → FileOperation → Reviewer
 *
 * It threads a shared {@link AgentContext}, fans agent events out to both an
 * in-memory log and an optional live sink, and supports a bounded review
 * retry loop. Each agent is independently swappable via {@link agentRegistry}.
 */
export class Orchestrator {
  private readonly maxReviewRetries: number;

  constructor(opts: { maxReviewRetries?: number } = {}) {
    this.maxReviewRetries = opts.maxReviewRetries ?? 1;
  }

  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    const events: AgentEvent[] = [];
    const emit = (e: AgentEvent) => {
      events.push(e);
      input.emit?.(e);
    };

    const ctx: AgentContext = {
      projectId: input.projectId,
      prompt: input.prompt,
      files: { ...(input.files ?? {}) },
      history: input.history ?? [],
      changes: [],
      usage: { tokens: 0 },
      emit,
      signal: input.signal,
    };

    // 1. Plan
    const planned = await plannerAgent.run(ctx);
    if (!planned.ok) return this.fail(ctx, events);

    // 2. Architect
    const architected = await architectAgent.run(ctx);
    if (!architected.ok) return this.fail(ctx, events);

    // 3..5 Generate → Apply → Review, with bounded retry.
    let attempt = 0;
    do {
      ctx.changes = [];
      const generated = await generatorAgent.run(ctx);
      if (!generated.ok) return this.fail(ctx, events);

      const applied = await fileOperationAgent.run(ctx);
      if (!applied.ok) return this.fail(ctx, events);

      const reviewed = await reviewerAgent.run(ctx);
      if (!reviewed.ok) return this.fail(ctx, events);

      if (ctx.review?.approved) break;
      attempt += 1;
      if (attempt <= this.maxReviewRetries) {
        emit({
          type: "log",
          agent: "reviewer",
          message: `Review requested changes — retry ${attempt}/${this.maxReviewRetries}.`,
        });
      }
    } while (attempt <= this.maxReviewRetries && !ctx.review?.approved);

    return {
      ok: Boolean(ctx.review?.approved),
      files: ctx.files,
      changes: ctx.changes,
      events,
      context: ctx,
      tokens: ctx.usage.tokens,
    };
  }

  private fail(
    ctx: AgentContext,
    events: AgentEvent[],
  ): OrchestratorResult {
    return {
      ok: false,
      files: ctx.files,
      changes: ctx.changes,
      events,
      context: ctx,
      tokens: ctx.usage.tokens,
    };
  }
}

/** Convenience singleton for server actions / routes. */
export const orchestrator = new Orchestrator({ maxReviewRetries: 1 });
