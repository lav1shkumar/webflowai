import { tool } from "langchain";
import { z } from "zod";
import {
  listProjectFiles,
  readFiles,
  removeFiles,
  runCommand,
  writeFiles,
} from "@/server/e2b";
import type { FileChange } from "./types";

const pathSchema = z.string().min(1).refine(
  (path) => !path.startsWith("/") && !path.split("/").includes(".."),
  "Use a workspace-relative path.",
);

export function createAgentTools(
  sandboxId: string,
  options: {
    onFileChange?: (change: FileChange) => void;
    onStage?: (
      stage: "planning" | "generation" | "verification",
      message: string,
    ) => void;
  } = {},
) {
  const changes = new Map<string, FileChange>();

  const record = (change: FileChange) => {
    changes.set(change.path, change);
    options.onFileChange?.(change);
  };

  return {
    tools: [
      tool(
        async ({ steps }) => {
          options.onStage?.("planning", steps.join("\n"));
          return "Plan recorded. Continue with the implementation.";
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
          const paths = await listProjectFiles(sandboxId);
          return paths.slice(0, 500);
        },
        {
          name: "list_files",
          description: "List project files.",
          schema: z.object({}),
        },
      ),
      tool(
        async ({ path }) => {
          try {
            const files = await readFiles(sandboxId, [path]);
            return files[path] ?? "";
          } catch {
            return `File not found: ${path}`;
          }
        },
        {
          name: "read_file",
          description: "Read one project file before editing it.",
          schema: z.object({ path: pathSchema }),
        },
      ),
      tool(
        async ({ path, content }) => {
          let op: FileChange["op"] = "create";
          try {
            await readFiles(sandboxId, [path]);
            op = "update";
          } catch {}
          await writeFiles(sandboxId, { [path]: content });
          const change = { path, content, op };
          record(change);
          options.onStage?.(
            "generation",
            `${op === "create" ? "Creating" : "Updating"} ${path}…`,
          );
          return `${op === "create" ? "Created" : "Updated"} ${path}`;
        },
        {
          name: "write_file",
          description: "Create or replace one project file with complete contents.",
          schema: z.object({ path: pathSchema, content: z.string() }),
        },
      ),
      tool(
        async ({ path }) => {
          await removeFiles(sandboxId, [path]);
          record({ path, op: "delete" });
          options.onStage?.("generation", `Removing ${path}…`);
          return `Deleted ${path}`;
        },
        {
          name: "delete_file",
          description: "Delete one project file.",
          schema: z.object({ path: pathSchema }),
        },
      ),
      tool(
        async ({ command, timeout }) => {
          options.onStage?.(
            "verification",
            command.includes("lint")
              ? "Checking code quality…"
              : command.includes("typecheck") || command.includes("tsc")
                ? "Checking types…"
                : command.includes("test")
                  ? "Running tests…"
                  : command.includes("build")
                    ? "Building the project…"
                    : command.includes("install")
                      ? "Installing dependencies…"
                      : "Verifying the implementation…",
          );
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
    ],
    getChanges: () => [...changes.values()],
  };
}
