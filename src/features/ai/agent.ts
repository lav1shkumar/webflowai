import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { getAgentModel } from "./model";
import { createAgentTools } from "./agent-tools";
import type { FileChange } from "./types";

export interface AgentRunInput {
  prompt: string;
  sandboxId: string;
  signal?: AbortSignal;
  onFileChange?: (change: FileChange) => void;
  onStage?: (
    stage: "context" | "planning" | "generation" | "verification",
    message: string,
  ) => void;
}

export async function runCodingAgent(input: AgentRunInput) {
  const { tools, getChanges } = createAgentTools(input.sandboxId, input);
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
    tools,
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
        { signal: input.signal, recursionLimit: 40 },
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
    .addEdge(START, "gather_context")
    .addEdge("gather_context", "code_agent")
    .addEdge("code_agent", END)
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
    summary:
      typeof last?.content === "string"
        ? last.content
        : "Agent run completed.",
  };
}
