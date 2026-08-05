import { tool } from "langchain";
import { z } from "zod";
import {
  listProjectFiles,
  readFiles,
  removeFiles,
  runCommand,
  startPreview,
  writeFiles,
} from "@/server/e2b";
import type {
  FileChange,
  GenerationActivity,
  GenerationStage,
} from "./types";

const pathSchema = z.string().min(1).refine(
  (path) => !path.startsWith("/") && !path.split("/").includes(".."),
  "Use a workspace-relative path.",
);

export function createAgentTools(
  sandboxId: string,
  options: {
    onFileChange?: (change: FileChange) => void;
    onStage?: (stage: GenerationStage, message: string) => void;
    onActivity?: (activity: GenerationActivity) => void;
    onLog?: (message: string) => void;
  } = {},
) {
  const changes = new Map<string, FileChange>();
  let nextActivityId = 0;
  let currentStage: GenerationStage = "context";
  let previewAttempts = 0;
  let previewUrl: string | null = null;

  const record = (change: FileChange) => {
    changes.set(change.path, change);
    options.onFileChange?.(change);
  };

  const runActivity = async <T>(
    activity: Omit<GenerationActivity, "id" | "status">,
    run: () => Promise<T>,
    failed?: (result: T) => boolean,
  ) => {
    const id = `activity-${++nextActivityId}`;
    options.onActivity?.({ ...activity, id, status: "running" });
    try {
      const result = await run();
      options.onActivity?.({
        ...activity,
        id,
        status: failed?.(result) ? "error" : "done",
      });
      return result;
    } catch (error) {
      options.onActivity?.({ ...activity, id, status: "error" });
      throw error;
    }
  };

  return {
    tools: [
      tool(
        async () => {
          currentStage = "planning";
          return runActivity(
            {
              stage: "planning",
              kind: "plan",
              label: "Planning implementation",
            },
            async () => {
              options.onStage?.("planning", "Planning implementation…");
              return "Plan recorded. Continue with the implementation.";
            },
          );
        },
        {
          name: "set_plan",
          description:
            "Record a comprehensive implementation plan covering architecture, behavior, files, implementation, and verification. Call this once before changing files.",
          schema: z.object({ steps: z.array(z.string()).min(4).max(8) }),
        },
      ),
      tool(
        async () => {
          return runActivity(
            {
              stage: currentStage,
              kind: "inspect",
              label: "Listing project files",
            },
            async () => {
              const paths = await listProjectFiles(sandboxId);
              return paths.slice(0, 500);
            },
          );
        },
        {
          name: "list_files",
          description: "List project files.",
          schema: z.object({}),
        },
      ),
      tool(
        async ({ path }) => {
          return runActivity(
            {
              stage: currentStage,
              kind: "inspect",
              label: `Reading ${path}`,
              path,
            },
            async () => {
              try {
                const files = await readFiles(sandboxId, [path]);
                return files[path] ?? "";
              } catch {
                return `File not found: ${path}`;
              }
            },
          );
        },
        {
          name: "read_file",
          description: "Read one project file before editing it.",
          schema: z.object({ path: pathSchema }),
        },
      ),
      tool(
        async ({ path, content }) => {
          currentStage = "generation";
          return runActivity(
            {
              stage: "generation",
              kind: "file",
              label: `Writing ${path}`,
              path,
            },
            async () => {
              let op: FileChange["op"] = "create";
              try {
                await readFiles(sandboxId, [path]);
                op = "update";
              } catch {}
              options.onStage?.(
                "generation",
                `${op === "create" ? "Creating" : "Updating"} ${path}…`,
              );
              await writeFiles(sandboxId, { [path]: content });
              const change = { path, content, op };
              record(change);
              return `${op === "create" ? "Created" : "Updated"} ${path}`;
            },
          );
        },
        {
          name: "write_file",
          description: "Create or replace one project file with complete contents.",
          schema: z.object({ path: pathSchema, content: z.string() }),
        },
      ),
      tool(
        async ({ path }) => {
          currentStage = "generation";
          return runActivity(
            {
              stage: "generation",
              kind: "file",
              label: `Deleting ${path}`,
              path,
            },
            async () => {
              options.onStage?.("generation", `Removing ${path}…`);
              await removeFiles(sandboxId, [path]);
              record({ path, op: "delete" });
              return `Deleted ${path}`;
            },
          );
        },
        {
          name: "delete_file",
          description: "Delete one project file.",
          schema: z.object({ path: pathSchema }),
        },
      ),
      tool(
        async ({ command, timeout }) => {
          const isGeneration =
            /\b(?:install|add|create|init|scaffold|generate)\b|\bcreate-[\w-]+/i.test(
              command,
            );
          const stage = isGeneration ? "generation" : "verification";
          currentStage = stage;
          const message = command.includes("lint")
            ? "Checking code quality…"
            : command.includes("typecheck") || command.includes("tsc")
              ? "Checking types…"
              : command.includes("test")
                ? "Running tests…"
                : command.includes("build")
                  ? "Building the project…"
                  : command.includes("install") || /\badd\b/.test(command)
                    ? "Installing dependencies…"
                    : isGeneration
                      ? "Scaffolding the project…"
                      : "Inspecting the runtime…";

          return runActivity(
            {
              stage,
              kind: "command",
              label: message.replace(/…$/, ""),
            },
            async () => {
              options.onStage?.(stage, message);
              const result = await runCommand(sandboxId, command, timeout);
              const output = result.stdout + result.stderr;
              return {
                exitCode: result.exitCode,
                output:
                  output.length > 30_000
                    ? `[truncated]\n${output.slice(-30_000)}`
                    : output,
              };
            },
            (result) => result.exitCode !== 0,
          );
        },
        {
          name: "run_command",
          description:
            "Run a bounded, non-interactive command for project scaffolding, dependency management, code generation, diagnostics, or verification. Use file tools for deliberate source edits; scaffolding and generators may create files.",
          schema: z.object({
            command: z.string().min(1).max(1_000),
            timeout: z.number().int().min(1_000).max(300_000).default(120_000),
          }),
        },
      ),
      tool(
        async ({ command }) => {
          currentStage = "preview";
          return runActivity(
            {
              stage: "preview",
              kind: "command",
              label: "Starting and checking preview",
            },
            async () => {
              previewUrl = null;
              if (previewAttempts >= 3) {
                options.onStage?.("preview", "Preview attempt limit reached.");
                return {
                  ready: false as const,
                  output: "Preview startup is limited to three attempts.",
                };
              }
              previewAttempts += 1;
              options.onStage?.(
                "preview",
                `Starting preview (attempt ${previewAttempts}/3)…`,
              );

              const result = await startPreview(
                sandboxId,
                command,
                options.onLog,
              );
              if (result.ready) previewUrl = result.url;
              return result;
            },
            (result) => !result.ready,
          );
        },
        {
          name: "start_preview",
          description:
            "Start the web app in the background and verify a successful HTTP response on port 3000. Returns captured startup logs when readiness fails. Limited to three calls.",
          schema: z.object({ command: z.string().min(1).max(1_000) }),
        },
      ),
    ],
    getChanges: () => [...changes.values()],
    getPreviewUrl: () => previewUrl,
  };
}
