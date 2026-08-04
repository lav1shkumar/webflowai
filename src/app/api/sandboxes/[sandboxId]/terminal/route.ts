import { Sandbox } from "e2b";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { E2B_PROJECT_DIR } from "@/server/e2b";
import { getCurrentDbUser } from "@/server/user";

export const runtime = "nodejs";
export const maxDuration = 300;

const startSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  pid: z.number().int().positive().optional(),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("input"),
    pid: z.number().int().positive(),
    data: z.string(),
  }),
  z.object({
    action: z.literal("resize"),
    pid: z.number().int().positive(),
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("kill"),
    pid: z.number().int().positive(),
  }),
]);

type RouteContext = { params: Promise<{ sandboxId: string }> };
const terminalSandboxes = new Map<string, Sandbox>();

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await prisma.project.findFirst({
    where: { sandboxId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 422 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let terminalKey: string | null = null;
      let sandbox: Sandbox | null = null;
      const send = (event: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        sandbox = await Sandbox.connect(sandboxId);
        const onData = (data: Uint8Array) => {
          const output = decoder.decode(data, { stream: true });
          if (output) send({ type: "data", data: output });
        };
        const terminal = parsed.data.pid
          ? await sandbox.pty.connect(parsed.data.pid, {
              onData,
              timeoutMs: 0,
              signal: request.signal,
            })
          : await sandbox.pty.create({
              cols: parsed.data.cols,
              rows: parsed.data.rows,
              cwd: E2B_PROJECT_DIR,
              onData,
              timeoutMs: 0,
              signal: request.signal,
            });

        terminalKey = `${sandboxId}:${terminal.pid}`;
        terminalSandboxes.set(terminalKey, sandbox);
        send({ type: "ready", pid: terminal.pid });
        const result = await terminal.wait();
        const output = decoder.decode();
        if (output) send({ type: "data", data: output });
        send({ type: "exit", code: result.exitCode });
      } catch (error) {
        if (!request.signal.aborted) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Terminal failed",
          });
        }
      } finally {
        if (terminalKey && terminalSandboxes.get(terminalKey) === sandbox) {
          terminalSandboxes.delete(terminalKey);
        }
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await prisma.project.findFirst({
    where: { sandboxId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 422 });
  }

  try {
    const sandbox =
      terminalSandboxes.get(`${sandboxId}:${parsed.data.pid}`) ??
      (await Sandbox.connect(sandboxId));
    if (parsed.data.action === "input") {
      await sandbox.pty.sendInput(
        parsed.data.pid,
        new TextEncoder().encode(parsed.data.data),
      );
    } else if (parsed.data.action === "resize") {
      await sandbox.pty.resize(parsed.data.pid, {
        cols: parsed.data.cols,
        rows: parsed.data.rows,
      });
    } else {
      await sandbox.pty.kill(parsed.data.pid);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Terminal operation failed", error);
    return Response.json({ error: "terminal-operation-failed" }, { status: 502 });
  }
}
