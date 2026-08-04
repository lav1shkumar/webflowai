import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSandbox, readProjectFiles, replaceFiles } from "@/server/e2b";
import { getCurrentDbUser } from "@/server/user";

export const runtime = "nodejs";

const schema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentDbUser();
  if (!user) return Response.json({ error: "not-authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 422 });
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ownerId: user.id },
    select: { id: true, sandboxId: true, files: true },
  });
  
  if (!project) return Response.json({ error: "project-not-found" }, { status: 404 });
  
  if (project.sandboxId) {
    return Response.json({ error: "sandbox-already-exists" }, { status: 409 });
  }

  try {
    const sandbox = await createSandbox(project.id, user.id);

    try {
      let files = Object.fromEntries(
        project.files.map((file) => [file.path, file.content]),
      );
      if (project.files.length === 0) {
        files = await readProjectFiles(sandbox.sandboxId);
        await prisma.file.createMany({
          data: Object.entries(files).map(([path, content]) => ({
            projectId: project.id,
            path,
            content,
            size: content.length,
          })),
        });
      } else {
        await replaceFiles(sandbox.sandboxId, files);
      }
      await prisma.project.update({
        where: { id: project.id },
        data: { sandboxId: sandbox.sandboxId },
      });
      return Response.json(
        {
          projectId: project.id,
          sandboxId: sandbox.sandboxId,
          status: "running",
          files,
        },
        { status: 201 },
      );
    } catch (error) {
      await sandbox.kill().catch(() => false);
      throw error;
    }
  } catch (error) {
    console.error("Sandbox creation failed", error);
    return Response.json({ error: "sandbox-creation-failed" }, { status: 502 });
  }
}
