"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { killSandbox } from "@/server/e2b";
import { getCurrentDbUser } from "@/server/user";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: "READY" | "GENERATING" | "DRAFT" | "ERROR" | "ARCHIVED";
  updatedAt: string;
  gradient: string;
}

export interface ProjectState {
  id: string;
  sandboxId: string | null;
  name: string;
  prompt: string | null;
  files: Record<string, string>;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }[];
}

const GRADIENTS = [
  "from-indigo-500 to-blue-600",
  "from-emerald-600 to-teal-700",
  "from-sky-500 to-indigo-600",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-orange-700",
  "from-blue-600 to-cyan-700",
];

/** Deterministic gradient so a project's art is stable across reloads. */
function gradientFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length]!;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

function deriveName(prompt: string): string {
  const cleaned = prompt.replace(/^\s*(build|create|make)\s+(me\s+)?(an?\s+)?/i, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ").trim();
  const name = words || "Untitled project";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Create a new project owned by the current user. */
export async function createProject(input: {
  prompt: string;
  name?: string;
  templateId?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const name = input.name?.trim() || deriveName(input.prompt);
  const base = slugify(name);
  let slug = base;
  let n = 1;
  // Ensure (ownerId, slug) uniqueness.
  while (
    await prisma.project.findFirst({
      where: { ownerId: user.id, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${++n}`;
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      prompt: input.prompt,
      templateId: input.templateId ?? null,
      ownerId: user.id,
      status: "DRAFT",
      framework: "next",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, id: project.id };
}

/** Rename a project owned by the current user. */
export async function renameProject(
  id: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not-authenticated" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "empty-name" };

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "not-found" };

  await prisma.project.update({
    where: { id: project.id },
    data: { name: trimmed.slice(0, 120) },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Permanently delete a project owned by the current user. Related files,
 * messages and generations are removed via `onDelete: Cascade`.
 */
export async function deleteProject(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, sandboxId: true },
  });
  if (!project) return { ok: false, error: "not-found" };

  if (project.sandboxId) {
    try {
      await killSandbox(project.sandboxId);
    } catch {
      return { ok: false, error: "sandbox-cleanup-failed" };
    }
  }

  await prisma.project.delete({ where: { id: project.id } });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true };
}

/** List the current user's projects for dashboard / projects views. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const user = await getCurrentDbUser();
  if (!user) return [];
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.prompt ?? p.description ?? "AI-generated application.",
    status: p.status as ProjectSummary["status"],
    updatedAt: p.updatedAt.toISOString(),
    gradient: gradientFor(p.id),
  }));
}

/** Load a project's files + chat history for the workspace. */
export async function getProjectState(id: string): Promise<ProjectState | null> {
  const user = await getCurrentDbUser();
  if (!user) return null;
  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    include: {
      files: true,
      messages: {
        orderBy: [{ createdAt: "asc" }, { role: "asc" }],
        take: 200,
      },
    },
  });
  if (!project) return null;

  await prisma.project.update({
    where: { id: project.id },
    data: { lastOpenedAt: new Date() },
  });

  return {
    id: project.id,
    sandboxId: project.sandboxId,
    name: project.name,
    prompt: project.prompt,
    files: Object.fromEntries(project.files.map((f) => [f.path, f.content])),
    messages: project.messages
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => ({
        id: m.id,
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
        createdAt: m.createdAt.getTime(),
      })),
  };
}
