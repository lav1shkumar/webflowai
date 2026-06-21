import { generateText } from "ai";
import { getModel, isAiConfigured, modelDefaults } from "../model";
import { prompts } from "../prompts";
import { createWorkspaceTools } from "../tools";
import type {
  Agent,
  AgentContext,
  ReviewIssue,
  ReviewResult,
} from "../types";

/**
 * Reviewer Agent — validates the applied changes for correctness, type
 * safety, and security. Produces a score and structured issues. Acts as the
 * pipeline's quality gate; the orchestrator may loop back on rejection.
 */
export const reviewerAgent: Agent<ReviewResult> = {
  kind: "reviewer",
  name: "Reviewer",
  description: "Validates output quality, types, and security.",

  async run(ctx: AgentContext) {
    ctx.emit({ type: "phase", agent: "reviewer", phase: "running" });
    ctx.emit({
      type: "log",
      agent: "reviewer",
      message: "Reviewing generated changes…",
    });

    try {
      const review = isAiConfigured
        ? await generateReview(ctx)
        : staticReview(ctx);

      ctx.review = review;
      ctx.emit({ type: "review", review });
      ctx.emit({ type: "phase", agent: "reviewer", phase: "succeeded" });
      return { kind: "reviewer", ok: true, output: review };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Review failed";
      ctx.emit({ type: "error", agent: "reviewer", message });
      ctx.emit({ type: "phase", agent: "reviewer", phase: "failed" });
      return { kind: "reviewer", ok: false, error: message };
    }
  },
};

async function generateReview(ctx: AgentContext): Promise<ReviewResult> {
  const { text, usage } = await generateText({
    model: getModel(),
    prompt: prompts.reviewer(ctx),
    tools: createWorkspaceTools(ctx, "reviewer"),
    maxSteps: 6,
    abortSignal: ctx.signal,
    ...modelDefaults,
  });
  ctx.usage.tokens += usage?.totalTokens ?? 0;
  return parseReview(text) ?? staticReview(ctx);
}

function parseReview(text: string): ReviewResult | null {
  try {
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as ReviewResult;
    if (typeof parsed.approved !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Lightweight static checks used in demo mode and as a baseline gate. */
function staticReview(ctx: AgentContext): ReviewResult {
  const issues: ReviewIssue[] = [];

  for (const change of ctx.changes) {
    if (change.op === "delete") continue;
    const content = change.content ?? "";
    if (content.trim().length === 0) {
      issues.push({
        severity: "warning",
        path: change.path,
        message: "File is empty.",
      });
    }
    if (/TODO|FIXME|placeholder/i.test(content)) {
      issues.push({
        severity: "warning",
        path: change.path,
        message: "Contains TODO/placeholder content.",
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8);

  return {
    approved: errors === 0,
    score,
    issues,
    summary:
      errors === 0
        ? `Changes look good (${ctx.changes.length} files).`
        : `Found ${errors} blocking issue(s).`,
  };
}
