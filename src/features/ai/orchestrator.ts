import { plannerAgent } from "./agents/planner";
import { architectAgent } from "./agents/architect";
import { generatorAgent } from "./agents/generator";
import { fileOperationAgent } from "./agents/file-operation";
import { verifierAgent } from "./agents/verifier";
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
  verifier: verifierAgent,
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
  /** Re-run generation to fix defects the verifier finds, up to N times. */
  maxFixAttempts?: number;
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
 *   Planner → Architect → Generator → FileOperation → Verifier ⇄ (fix) → Reviewer
 *
 * After generation, the deterministic Verifier checks the real workspace for
 * concrete defects (syntax, broken imports, invalid JSON). If it finds blocking
 * errors, the orchestrator runs targeted fix passes (Generator in fix mode →
 * apply → re-verify) up to {@link maxFixAttempts} times before handing off to
 * the LLM Reviewer for a final summary. It threads a shared {@link AgentContext},
 * fans agent events out to both an in-memory log and an optional live sink.
 */
export class Orchestrator {
  private readonly maxReviewRetries: number;
  private readonly maxFixAttempts: number;

  constructor(opts: { maxReviewRetries?: number; maxFixAttempts?: number } = {}) {
    this.maxReviewRetries = opts.maxReviewRetries ?? 1;
    this.maxFixAttempts = opts.maxFixAttempts ?? 2;
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

    const maxFixAttempts = input.maxFixAttempts ?? this.maxFixAttempts;

    // 1. Plan
    const planned = await plannerAgent.run(ctx);
    if (!planned.ok) return this.fail(ctx, events);

    // 2. Architect
    const architected = await architectAgent.run(ctx);
    if (!architected.ok) return this.fail(ctx, events);

    // 3. Generate → Apply
    ctx.changes = [];
    const generated = await generatorAgent.run(ctx);
    if (!generated.ok) return this.fail(ctx, events);

    const applied = await fileOperationAgent.run(ctx);
    if (!applied.ok) return this.fail(ctx, events);

    // 4. Verify ⇄ Fix loop — real, deterministic validation drives correction.
    let fixAttempt = 0;
    for (;;) {
      await verifierAgent.run(ctx);
      const verification = ctx.verification;
      // No verifier signal or already clean → done verifying.
      if (!verification || verification.ok) break;
      if (fixAttempt >= maxFixAttempts) {
        emit({
          type: "log",
          agent: "verifier",
          message: `Still ${
            verification.issues.filter((i) => i.severity === "error").length
          } issue(s) after ${maxFixAttempts} fix attempt(s); handing off for review.`,
        });
        break;
      }
      fixAttempt += 1;
      emit({
        type: "log",
        agent: "generator",
        message: `Applying fix pass ${fixAttempt}/${maxFixAttempts}…`,
      });
      // Re-run the generator in fix mode (it detects ctx.verification.ok=false),
      // then apply the new changes. `ctx.verification` stays set so the
      // generator knows it's a fix pass; the next loop turn re-verifies.
      ctx.changes = [];
      const fixGen = await generatorAgent.run(ctx);
      if (!fixGen.ok) break;
      const fixApplied = await fileOperationAgent.run(ctx);
      if (!fixApplied.ok) break;
      // Clear the stale verification so the generator's next mode is decided
      // fresh by the verifier on the following iteration.
      ctx.verification = undefined;
    }

    // 5. Review (LLM summary + final opinion), with bounded retry.
    let attempt = 0;
    do {
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
        ctx.changes = [];
        const regen = await generatorAgent.run(ctx);
        if (!regen.ok) return this.fail(ctx, events);
        const reapplied = await fileOperationAgent.run(ctx);
        if (!reapplied.ok) return this.fail(ctx, events);
      }
    } while (attempt <= this.maxReviewRetries && !ctx.review?.approved);

    const verificationOk = ctx.verification ? ctx.verification.ok : true;
    return {
      ok: Boolean(ctx.review?.approved) && verificationOk,
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
