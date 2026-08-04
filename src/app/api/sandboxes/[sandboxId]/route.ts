import { Sandbox, SandboxNotFoundError } from "e2b";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSandbox,
  killSandbox,
  readFiles,
  removeFiles,
  renameFile,
  runCommand,
  writeFiles,
} from "@/server/e2b";
import { getCurrentDbUser } from "@/server/user";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["reconnect", "restart"]),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("runCommand"), command: z.string().min(1) }),
  z.object({
    action: z.literal("readFiles"),
    paths: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("writeFiles"),
    files: z.record(z.string(), z.string()),
  }),
  z.object({
    action: z.literal("renameFile"),
    oldPath: z.string().min(1),
    newPath: z.string().min(1),
  }),
  z.object({
    action: z.literal("removeFiles"),
    paths: z.array(z.string()).min(1),
  }),
]);

type RouteContext = { params: Promise<{ sandboxId: string }> };

async function getProject(sandboxId: string, ownerId: string) {
  return prisma.project.findFirst({
    where: { sandboxId, ownerId },
    select: { id: true },
  });
}

function failed(error: unknown) {
  console.error("Sandbox operation failed", error);
  return Response.json({ error: "sandbox-operation-failed" }, { status: 502 });
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await getProject(sandboxId, user.id);
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 422 });
  }

  if (parsed.data.action === "reconnect") {
    try {
      const sandbox = await Sandbox.connect(sandboxId);
      const info = await sandbox.getInfo();
      return Response.json({
        projectId: project.id,
        sandboxId,
        status: "running",
        expiresAt: info.endAt,
      });
    } catch (error) {
      if (!(error instanceof SandboxNotFoundError)) return failed(error);
      return Response.json({ error: "remote-sandbox-not-found" }, { status: 410 });
    }
  }

  try {
    await killSandbox(sandboxId);
    const sandbox = await createSandbox(project.id, user.id);

    try {
      await prisma.project.update({
        where: { id: project.id },
        data: { sandboxId: sandbox.sandboxId },
      });
      return Response.json({
        projectId: project.id,
        sandboxId: sandbox.sandboxId,
        status: "running",
      });
    } catch (error) {
      await sandbox.kill().catch(() => false);
      throw error;
    }
  } catch (error) {
    return failed(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await getProject(sandboxId, user.id);
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 422 });
  }

  try {
    switch (parsed.data.action) {
      case "runCommand":
        return Response.json(
          await runCommand(sandboxId, parsed.data.command),
        );
      case "readFiles":
        return Response.json(await readFiles(sandboxId, parsed.data.paths));
      case "writeFiles":
        return Response.json(await writeFiles(sandboxId, parsed.data.files));
      case "renameFile":
        return Response.json(
          await renameFile(
            sandboxId,
            parsed.data.oldPath,
            parsed.data.newPath,
          ),
        );
      case "removeFiles":
        await removeFiles(sandboxId, parsed.data.paths);
        return Response.json({ ok: true });
    }
  } catch (error) {
    if (error instanceof SandboxNotFoundError) {
      return Response.json({ error: "remote-sandbox-not-found" }, { status: 410 });
    }
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const { sandboxId } = await params;
  const project = await getProject(sandboxId, user.id);
  if (!project) return Response.json({ error: "sandbox-not-found" }, { status: 404 });

  try {
    await killSandbox(sandboxId);
    await prisma.project.update({
      where: { id: project.id },
      data: { sandboxId: null },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
