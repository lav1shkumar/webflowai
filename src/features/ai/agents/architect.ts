import { generateText, stepCountIs } from "ai";
import { getModel, isAiConfigured, modelDefaults } from "../model";
import { prompts } from "../prompts";
import { createWorkspaceTools } from "../tools";
import type { Agent, AgentContext, ProjectBlueprint } from "../types";

/**
 * Architect Agent — turns the plan into a concrete project blueprint:
 * directories, files with purpose, and dependency set.
 */
export const architectAgent: Agent<ProjectBlueprint> = {
  kind: "architect",
  name: "Architect",
  description: "Designs the concrete project structure and dependencies.",

  async run(ctx: AgentContext) {
    ctx.emit({ type: "phase", agent: "architect", phase: "running" });
    ctx.emit({
      type: "log",
      agent: "architect",
      message: "Designing project structure…",
    });

    try {
      const blueprint = isAiConfigured
        ? await generateBlueprint(ctx)
        : defaultBlueprint(ctx);

      ctx.blueprint = blueprint;
      ctx.emit({ type: "blueprint", blueprint });
      ctx.emit({ type: "phase", agent: "architect", phase: "succeeded" });
      return { kind: "architect", ok: true, output: blueprint };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Architecture step failed";
      ctx.emit({ type: "error", agent: "architect", message });
      ctx.emit({ type: "phase", agent: "architect", phase: "failed" });
      return { kind: "architect", ok: false, error: message };
    }
  },
};

async function generateBlueprint(
  ctx: AgentContext,
): Promise<ProjectBlueprint> {
  const { text, usage } = await generateText({
    model: getModel(),
    prompt: prompts.architect(ctx),
    tools: createWorkspaceTools(ctx, "architect"),
    stopWhen: stepCountIs(6),
    abortSignal: ctx.signal,
    ...modelDefaults,
  });
  ctx.usage.tokens += usage?.totalTokens ?? 0;
  return parseBlueprint(text) ?? defaultBlueprint(ctx);
}

function parseBlueprint(text: string): ProjectBlueprint | null {
  try {
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as ProjectBlueprint;
    if (!parsed.files?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function defaultBlueprint(ctx: AgentContext): ProjectBlueprint {
  return {
    framework: "static",
    description: ctx.plan?.summary ?? ctx.prompt,
    directories: ["public"],
    files: [
      { path: "package.json", purpose: "Project manifest and dev script" },
      { path: "server.mjs", purpose: "Zero-dependency static dev server" },
      { path: "public/index.html", purpose: "Application entry page" },
      { path: "public/styles.css", purpose: "Styles for the app shell" },
      { path: "README.md", purpose: "Project documentation" },
    ],
    dependencies: {},
  };
}
