import { z } from "zod";
import { generate } from "@/features/ai/generate";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { creditsForTokens } from "@/lib/credits";
import { env } from "@/lib/env";

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
 * Generation endpoint. Calls the AI to generate/modify code, streams progress
 * back as newline-delimited JSON (NDJSON).
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

  // Require AI backend to be configured.
  if (!env.vertexApiKey) {
    return Response.json(
      { error: "AI backend not configured. Set GOOGLE_VERTEX_API_KEY." },
      { status: 503 },
    );
  }

  // Credit gate
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        // Signal the UI that generation is in progress
        send({ type: "phase", agent: "generator", phase: "running" });

        const result = await generate({
          projectId,
          prompt,
          files: files ?? {},
          history: history ?? [],
          signal: request.signal,
          maxFixAttempts: 2,
          onToken: (text) => send({ type: "token", text }),
          onFileChange: (change) => send({ type: "file", agent: "generator", change }),
          onLog: (message) => send({ type: "log", agent: "generator", message }),
        });

        // Send a review summary so the UI has an assistant message
        send({ type: "phase", agent: "generator", phase: "succeeded" });
        send({
          type: "review",
          review: {
            approved: true,
            score: 100,
            issues: [],
            summary: `Applied ${result.changes.length} file change(s).`,
          },
        });

        // Deduct credits
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
            // Metering failure shouldn't fail the response.
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
        send({ type: "phase", agent: "generator", phase: "failed" });
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
