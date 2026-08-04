import { z } from "zod";
import { generate } from "@/features/ai/generate";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { usageTokensForModelTokens } from "@/lib/tokens";
import type { GenerationEvent } from "@/features/ai/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  prompt: z.string().min(1),
  files: z.record(z.string(), z.string()).optional(),
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

  const { prompt, files } = parsed.data;

  // Require AI backend to be configured.
  if (
    !process.env.AZURE_OPENAI_API_KEY ||
    !process.env.AZURE_RESOURCE_NAME ||
    !process.env.WEBFLOWAI_MODEL
  ) {
    return Response.json(
      {
        error:
          "AI backend not configured. Set AZURE_OPENAI_API_KEY, AZURE_RESOURCE_NAME, and WEBFLOWAI_MODEL.",
      },
      { status: 503 },
    );
  }

  const user = await getCurrentDbUser();
  if (user && user.tokensBalance <= 0) {
    return Response.json(
      {
        error: "insufficient-tokens",
        balance: user.tokensBalance,
      },
      { status: 402 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerationEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "status", status: "running" });

        const result = await generate({
          prompt,
          files: files ?? {},
          signal: request.signal,
          onFileChange: (change) => send({ type: "file", change }),
          onLog: (message) => send({ type: "log", message }),
        });

        send({ type: "status", status: "succeeded" });

        let tokensUsed = 0;
        let tokensRemaining: number | null = null;
        if (user) {
          tokensUsed = usageTokensForModelTokens(result.tokens);
          try {
            const updated = await prisma.user.update({
              where: { id: user.id },
              data: { tokensBalance: { decrement: tokensUsed } },
              select: { tokensBalance: true },
            });
            tokensRemaining = updated.tokensBalance;
          } catch {
            // Metering failure shouldn't fail the response.
          }
        }

        send({
          type: "done",
          summary: `Applied ${result.changes.length} file change(s).`,
          tokensUsed,
          tokensRemaining,
          signedIn: Boolean(user),
        });
      } catch (err) {
        send({ type: "status", status: "failed" });
        send({
          type: "error",
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
