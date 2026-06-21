import type { Agent, AgentContext, FileChange } from "../types";

/**
 * File Operation Agent — applies the generated {@link FileChange}s to the
 * in-memory workspace map. The orchestrator persists the resulting files and
 * the WebContainer service mounts them. This agent is the single chokepoint
 * for mutating project files, which keeps writes auditable.
 */
export const fileOperationAgent: Agent<FileChange[]> = {
  kind: "file-operation",
  name: "File Operation",
  description: "Applies generated changes to the workspace filesystem.",

  async run(ctx: AgentContext) {
    ctx.emit({ type: "phase", agent: "file-operation", phase: "running" });

    try {
      const applied: FileChange[] = [];
      for (const change of ctx.changes) {
        applyChange(ctx, change);
        applied.push(change);
        ctx.emit({
          type: "log",
          agent: "file-operation",
          message: `${labelFor(change.op)} ${change.path}`,
        });
      }
      ctx.emit({ type: "phase", agent: "file-operation", phase: "succeeded" });
      return { kind: "file-operation", ok: true, output: applied };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Applying changes failed";
      ctx.emit({ type: "error", agent: "file-operation", message });
      ctx.emit({ type: "phase", agent: "file-operation", phase: "failed" });
      return { kind: "file-operation", ok: false, error: message };
    }
  },
};

function applyChange(ctx: AgentContext, change: FileChange): void {
  if (change.op === "delete") {
    delete ctx.files[change.path];
    return;
  }
  ctx.files[change.path] = change.content ?? "";
}

function labelFor(op: FileChange["op"]): string {
  switch (op) {
    case "create":
      return "Created";
    case "update":
      return "Updated";
    case "delete":
      return "Deleted";
  }
}
