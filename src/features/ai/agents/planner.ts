import { generateText, stepCountIs } from "ai";
import { getModel, isAiConfigured, modelDefaults } from "../model";
import { prompts } from "../prompts";
import { createWorkspaceTools } from "../tools";
import { shortId } from "@/lib/utils";
import type { Agent, AgentContext, ExecutionPlan } from "../types";

/**
 * Planner Agent — classifies intent and produces an ordered execution plan.
 * Falls back to a deterministic heuristic plan when no model is configured,
 * so the full pipeline remains demoable offline.
 */
export const plannerAgent: Agent<ExecutionPlan> = {
  kind: "planner",
  name: "Planner",
  description: "Decomposes the request into an ordered execution plan.",

  async run(ctx: AgentContext) {
    ctx.emit({ type: "phase", agent: "planner", phase: "running" });
    ctx.emit({ type: "log", agent: "planner", message: "Analyzing request…" });

    try {
      const plan = isAiConfigured
        ? await generatePlan(ctx)
        : heuristicPlan(ctx);

      ctx.plan = plan;
      ctx.emit({ type: "plan", plan });
      ctx.emit({ type: "phase", agent: "planner", phase: "succeeded" });
      return { kind: "planner", ok: true, output: plan };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Planning failed";
      ctx.emit({ type: "error", agent: "planner", message });
      ctx.emit({ type: "phase", agent: "planner", phase: "failed" });
      return { kind: "planner", ok: false, error: message };
    }
  },
};

async function generatePlan(ctx: AgentContext): Promise<ExecutionPlan> {
  const { text, usage } = await generateText({
    model: getModel(),
    prompt: prompts.planner(ctx),
    tools: createWorkspaceTools(ctx, "planner"),
    stopWhen: stepCountIs(6),
    abortSignal: ctx.signal,
    ...modelDefaults,
  });
  ctx.usage.tokens += usage?.totalTokens ?? 0;
  return parsePlan(text) ?? heuristicPlan(ctx);
}

function parsePlan(text: string): ExecutionPlan | null {
  try {
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as ExecutionPlan;
    if (!parsed.steps?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function heuristicPlan(ctx: AgentContext): ExecutionPlan {
  const fresh = Object.keys(ctx.files).length === 0;
  const intent = fresh ? "create" : "feature";
  const arch = shortId("step");
  const gen = shortId("step");
  const apply = shortId("step");
  const review = shortId("step");
  return {
    intent,
    summary: fresh
      ? `Scaffold a new application for: ${ctx.prompt}`
      : `Apply requested changes: ${ctx.prompt}`,
    steps: [
      {
        id: arch,
        title: "Design architecture",
        description: "Resolve directory and file structure with dependencies.",
        agent: "architect",
        dependsOn: [],
      },
      {
        id: gen,
        title: "Generate code",
        description: "Produce complete file contents for the blueprint.",
        agent: "generator",
        dependsOn: [arch],
      },
      {
        id: apply,
        title: "Apply changes",
        description: "Write generated files into the workspace.",
        agent: "file-operation",
        dependsOn: [gen],
      },
      {
        id: review,
        title: "Review output",
        description: "Validate correctness, types, and security.",
        agent: "reviewer",
        dependsOn: [apply],
      },
    ],
  };
}
