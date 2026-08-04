import { Sandbox } from "e2b";
import { prisma } from "@/lib/prisma";
import { E2B_PREVIEW_PORT, E2B_PROJECT_DIR } from "@/server/e2b";
import { getCurrentDbUser } from "@/server/user";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sandboxId: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await prisma.project.findFirst({
    where: { sandboxId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        const sandbox = await Sandbox.connect(sandboxId);

        send({ type: "status", status: "installing" });
        await sandbox.commands.run("npm install", {
          cwd: E2B_PROJECT_DIR,
          timeoutMs: 10 * 60 * 1000,
          onStdout: (data) => send({ type: "log", data }),
          onStderr: (data) => send({ type: "log", data }),
        });

        send({ type: "status", status: "starting" });
        await sandbox.commands.run("pkill -f '[n]ext dev' || true", {
          cwd: E2B_PROJECT_DIR,
        });

        const host = sandbox.getHost(E2B_PREVIEW_PORT);
        const url = host.startsWith("http") ? host : `https://${host}`;
        const devServer = await sandbox.commands.run(
          `npm run dev -- --hostname 0.0.0.0 --port ${E2B_PREVIEW_PORT}`,
          {
            cwd: E2B_PROJECT_DIR,
            background: true,
            onStdout: (data) => send({ type: "log", data }),
            onStderr: (data) => send({ type: "log", data }),
          },
        );

        try {
          await sandbox.commands.run(
            `until curl -fsS http://127.0.0.1:${E2B_PREVIEW_PORT} >/dev/null; do sleep 0.5; done`,
            { timeoutMs: 60_000 },
          );
        } catch {
          await devServer.kill();
          throw new Error("Next.js did not become ready in time");
        }

        await devServer.disconnect();
        send({ type: "ready", url });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Preview failed",
        });
      } finally {
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
