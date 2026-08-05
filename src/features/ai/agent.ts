import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { getAgentModel } from "./model";
import { createAgentTools } from "./agent-tools";
import type { FileChange, GenerationActivity, GenerationStage } from "./types";

export interface AgentRunInput {
  prompt: string;
  sandboxId: string;
  signal?: AbortSignal;
  onFileChange?: (change: FileChange) => void;
  onStage?: (stage: GenerationStage, message: string) => void;
  onActivity?: (activity: GenerationActivity) => void;
  onLog?: (message: string) => void;
}

export async function runCodingAgent(input: AgentRunInput) {
  const { tools, getChanges, getPreviewUrl } = createAgentTools(
    input.sandboxId,
    input,
  );
  const model = getAgentModel();
  const contextAgent = createAgent({
    model,
    tools: tools.filter(
      (tool) => tool.name === "list_files" || tool.name === "read_file",
    ),
    systemPrompt: `You are the read-only context gathering node for a coding agent.

First list the repository files, then read the package, configuration, entry point, and task-relevant source files. Return a concise report covering the framework, app structure, conventions, reusable assets or components, and the files relevant to the request. Do not create an implementation plan and do not modify files.`,
  });
  const agent = createAgent({
    model,
    tools: tools.filter((tool) => tool.name !== "start_preview"),
    systemPrompt: `You are WebFlowAI, a coding agent working inside an isolated project sandbox.

Framework selection:
- Preserve the existing framework when the project has package configuration.
- For a new or empty project, use only Vite or Next.js. Default to Vite with React and TypeScript unless the user explicitly mentions Next.js.
- Scaffold the complete runnable project, including package.json with dev and build scripts and all required configuration and entry files. Install the required dependencies.
- The dev script must start every required process without additional arguments and expose the frontend on 0.0.0.0:3000.
- Vite dev scripts must invoke vite with --host 0.0.0.0 --port 3000, including when vite is wrapped by concurrently. Full-stack Vite apps must access their backend through a Vite /api proxy instead of browser-side localhost.
- Next.js dev scripts must invoke next dev with --hostname 0.0.0.0 --port 3000.

For every request:
1. Use the gathered repository context to call set_plan with a comprehensive plan covering architecture, behavior, exact files, implementation steps, and verification.
2. Read any additional files needed before editing them.
3. Use file tools to implement the request completely.
4. Use run_command for non-interactive project scaffolding, dependency management, code generation, diagnostics, and verification.
5. Run npm install and npm run build before finishing.
6. If a command fails, inspect its exit code and output, fix the issue, and run it again.

Use file tools for deliberate source edits. Do not use shell redirection or text-rewrite commands to edit source files; project scaffolding and code generators may create or update files through run_command.
Keep changes focused. Do not only describe code: use the tools to make the changes. Finish with a concise summary.`,
  });
  const runtimeAgent = createAgent({
    model,
    tools: tools.filter((tool) => tool.name !== "set_plan"),
    systemPrompt: `You are the final runtime verification node for a Vite or Next.js coding agent.

The project has already been implemented and built. Inspect its package.json and runtime configuration, then determine any required setup command and the command that starts the complete web app on 0.0.0.0:3000. Run required setup with run_command, then call start_preview.

If start_preview fails, use its captured logs to diagnose the problem. Read and edit only the files needed to repair startup, run relevant checks, and call start_preview again. You have at most three preview attempts. Do not finish until start_preview reports ready.

After it succeeds, return a concise summary only of the code and user-visible product changes, including any code repairs you made. Do not mention dependency installation, commands, builds, runtime verification, ports, or preview readiness.`,
  });

  const State = Annotation.Root({
    context: Annotation<string>,
    messages: Annotation<BaseMessage[]>,
    tokens: Annotation<number>({
      reducer: (total, tokens) => total + tokens,
      default: () => 0,
    }),
  });
  const graph = new StateGraph(State)
    .addNode("gather_context", async () => {
      input.onStage?.("context", "Inspecting project files…");
      const result = await contextAgent.invoke(
        {
          messages: [
            {
              role: "user",
              content: `Gather repository context for this request:\n${input.prompt}`,
            },
          ],
        },
        { signal: input.signal, recursionLimit: 200 },
      );
      const responses = result.messages.filter(AIMessage.isInstance);
      const last = responses.at(-1);
      return {
        context:
          typeof last?.content === "string"
            ? last.content
            : "No additional repository context was found.",
        tokens: responses.reduce(
          (total, message) =>
            total + (message.usage_metadata?.total_tokens ?? 0),
          0,
        ),
      };
    })
    .addNode("code_agent", async (state) => {
      const result = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: `REQUEST:\n${input.prompt}\n\nGATHERED REPOSITORY CONTEXT:\n${state.context}`,
            },
          ],
        },
        { signal: input.signal, recursionLimit: 40 },
      );
      const responses = result.messages.filter(AIMessage.isInstance);
      return {
        messages: result.messages,
        tokens: responses.reduce(
          (total, message) =>
            total + (message.usage_metadata?.total_tokens ?? 0),
          0,
        ),
      };
    })
    .addNode("runtime", async (state) => {
      const implementationResponses = state.messages.filter(
        AIMessage.isInstance,
      );
      const implementationSummary = implementationResponses.at(-1)?.content;
      const result = await runtimeAgent.invoke(
        {
          messages: [
            {
              role: "user",
              content: `REQUEST:\n${input.prompt}\n\nGATHERED REPOSITORY CONTEXT:\n${state.context}\n\nCODING AGENT SUMMARY:\n${typeof implementationSummary === "string" ? implementationSummary : "Implementation completed."}`,
            },
          ],
        },
        { signal: input.signal, recursionLimit: 40 },
      );
      const responses = result.messages.filter(AIMessage.isInstance);
      if (!getPreviewUrl()) {
        throw new Error(
          "Runtime verification ended before the preview became ready.",
        );
      }
      return {
        messages: result.messages,
        tokens: responses.reduce(
          (total, message) =>
            total + (message.usage_metadata?.total_tokens ?? 0),
          0,
        ),
      };
    })
    .addEdge(START, "gather_context")
    .addEdge("gather_context", "code_agent")
    .addEdge("code_agent", "runtime")
    .addEdge("runtime", END)
    .compile();

  const result = await graph.invoke(
    { context: "", messages: [], tokens: 0 },
    { signal: input.signal, recursionLimit: 50 },
  );
  const responses = result.messages.filter(AIMessage.isInstance);
  const last = responses.at(-1);

  return {
    changes: getChanges(),
    tokens: result.tokens,
    previewUrl: getPreviewUrl()!,
    summary:
      typeof last?.content === "string" ? last.content : "Agent run completed.",
  };
}
