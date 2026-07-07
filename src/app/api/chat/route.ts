import { z } from "zod";
import { Orchestrator } from "@/features/ai/orchestrator";
import type { AgentEvent } from "@/features/ai/types";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { creditsForTokens } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  files: z.record(z.string(), z.string()).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

/**
 * Server-side generation endpoint. Runs the multi-agent pipeline and streams
 * each {@link AgentEvent} to the client as newline-delimited JSON (NDJSON),
 * which the workspace store consumes to drive the live UI.
 *
 * Credits: signed-in users are metered per generation. We block up front when
 * the balance is exhausted (HTTP 402) and deduct token-based credits once the
 * run completes, reporting the remaining balance in the terminal `done` event.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { projectId, prompt, files, history } = parsed.data;

  // Credit gate (signed-in users only; demo mode is unmetered).
  const user = await getCurrentDbUser();
  if (user && user.creditsBalance <= 0) {
    return Response.json(
      {
        error: "insufficient-credits",
        balance: user.creditsBalance,
        monthly: user.creditsMonthly,
      },
      { status: 402 },
    );
  }

  const encoder = new TextEncoder();
  const orchestrator = new Orchestrator({
    maxFixAttempts: 2,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent | Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await orchestrator.run({
          projectId,
          prompt,
          files,
          history,
          emit: (e) => send(e),
          signal: request.signal,
        });

        // Meter credits for signed-in users based on tokens consumed.
        let creditsUsed = 0;
        let creditsRemaining: number | null = null;
        if (user) {
          creditsUsed = creditsForTokens(result.tokens);
          try {
            const updated = await prisma.user.update({
              where: { id: user.id },
              data: { creditsBalance: { decrement: creditsUsed } },
              select: { creditsBalance: true },
            });
            creditsRemaining = updated.creditsBalance;
          } catch {
            // Metering failure shouldn't fail the generation response.
          }
        }

        send({
          type: "done",
          ok: result.ok,
          fileCount: Object.keys(result.files).length,
          tokens: result.tokens,
          creditsUsed,
          creditsRemaining,
          signedIn: Boolean(user),
        });
      } catch (err) {
        send({
          type: "fatal",
          message: err instanceof Error ? err.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

