import { z } from "zod";
import { runCodingAgent } from "@/features/ai/agent";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { usageTokensForModelTokens } from "@/lib/tokens";
import { readProjectFiles } from "@/server/e2b";
import type { GenerationEvent } from "@/features/ai/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
});

async function persistRun(
  projectId: string,
  response: string,
  status: "READY" | "ERROR",
  files: Record<string, string> | null,
) {
  await prisma.$transaction(async (tx) => {
    if (files) {
      await tx.file.deleteMany({ where: { projectId } });
      const entries = Object.entries(files);
      if (entries.length > 0) {
        await tx.file.createMany({
          data: entries.map(([path, content]) => ({
            projectId,
            path,
            content,
            size: content.length,
          })),
        });
      }
    }
    await tx.message.create({
      data: { projectId, role: "ASSISTANT", content: response },
    });
    await tx.project.update({ where: { id: projectId }, data: { status } });
  });
}

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

  const { projectId, prompt } = parsed.data;

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
  if (!user) {
    return Response.json({ error: "not-authenticated" }, { status: 401 });
  }
  if (user.tokensBalance <= 0) {
    return Response.json(
      {
        error: "insufficient-tokens",
        balance: user.tokensBalance,
      },
      { status: 402 },
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: {
      id: true,
      sandboxId: true,
      files: { select: { path: true, content: true } },
      messages: {
        where: { role: { in: ["USER", "ASSISTANT"] } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { role: true, content: true },
      },
    },
  });
  if (!project) {
    return Response.json({ error: "project-not-found" }, { status: 404 });
  }
  if (!project.sandboxId) {
    return Response.json({ error: "sandbox-not-ready" }, { status: 409 });
  }

  const history = project.messages.reverse().map((message) => ({
    role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: message.content.slice(0, 1500),
  }));

  await prisma.$transaction([
    prisma.project.update({
      where: { id: project.id },
      data: { status: "GENERATING" },
    }),
    prisma.message.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: "USER",
        content: prompt,
      },
    }),
  ]);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerationEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };
      const heartbeat = setInterval(
        () => send({ type: "log", message: "" }),
        15_000,
      );

      try {
        send({ type: "status", status: "running" });

        const result = await runCodingAgent({
          prompt,
          history,
          sandboxId: project.sandboxId!,
          signal: request.signal,
          onStage: (stage, message) =>
            send({ type: "stage", stage, message }),
          onActivity: (activity) => send({ type: "activity", activity }),
          onLog: (message) => send({ type: "log", message }),
        });
        const files = await readProjectFiles(project.sandboxId!);
        const filesBefore = Object.fromEntries(
          project.files.map((file) => [file.path, file.content]),
        );
        const changedFiles = [
          ...new Set([...Object.keys(filesBefore), ...Object.keys(files)]),
        ].filter((path) => filesBefore[path] !== files[path]);

        const tokensUsed = usageTokensForModelTokens(result.tokens);
        let tokensRemaining = user.tokensBalance;
        try {
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: { tokensBalance: { decrement: tokensUsed } },
            select: { tokensBalance: true },
          });
          tokensRemaining = updated.tokensBalance;
        } catch {}
        await persistRun(
          project.id,
          result.summary,
          "READY",
          files,
        );

        send({ type: "status", status: "succeeded" });

        send({
          type: "done",
          summary: result.summary,
          tokensUsed,
          tokensRemaining,
          signedIn: true,
          files: changedFiles,
          previewUrl: result.previewUrl,
        });
      } catch (err) {
        const message = request.signal.aborted
          ? "Generation stopped because the client disconnected."
          : err instanceof Error
            ? err.message
            : "Generation failed";
        await persistRun(
          project.id,
          `Generation failed: ${message}`,
          "ERROR",
          await readProjectFiles(project.sandboxId!).catch(() => null),
        ).catch(() => {});
        send({ type: "status", status: "failed" });
        send({ type: "error", message });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
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
