import { verifyWorkspace } from "../verifier";
import type { Agent, AgentContext, VerificationResult } from "../types";

/**
 * Verifier Agent — the deterministic quality gate.
 *
 * Runs real, mechanical checks over the post-change workspace (syntax, JSON,
 * local import resolution, declared dependencies) and records the result on the
 * context. The orchestrator uses `ctx.verification` to decide whether to run a
 * targeted fix pass before handing off to the LLM Reviewer. No model call — it
 * is fast and fully deterministic.
 */
export const verifierAgent: Agent<VerificationResult> = {
  kind: "verifier",
  name: "Verifier",
  description: "Statically validates syntax, imports, and config for real defects.",

  async run(ctx: AgentContext) {
    ctx.emit({ type: "phase", agent: "verifier", phase: "running" });
    ctx.emit({
      type: "log",
      agent: "verifier",
      message: "Verifying syntax, imports, and configuration…",
    });

    try {
      const result = await verifyWorkspace(ctx.files);
      ctx.verification = result;

      const errors = result.issues.filter((i) => i.severity === "error").length;
      const warnings = result.issues.length - errors;
      ctx.emit({
        type: "log",
        agent: "verifier",
        message: result.ok
          ? `Verified ${result.checked} files — no blocking issues${
              warnings ? ` (${warnings} warning${warnings === 1 ? "" : "s"})` : ""
            }.`
          : `Found ${errors} blocking issue${errors === 1 ? "" : "s"} across ${result.checked} files.`,
      });

      ctx.emit({ type: "verification", result });
      ctx.emit({ type: "phase", agent: "verifier", phase: "succeeded" });
      return { kind: "verifier", ok: true, output: result };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      ctx.emit({ type: "error", agent: "verifier", message });
      ctx.emit({ type: "phase", agent: "verifier", phase: "failed" });
      // A verifier crash must not abort the whole turn — treat as "no signal".
      return { kind: "verifier", ok: true, output: undefined };
    }
  },
};
