import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/env";
import type { User } from "@prisma/client";

/**
 * Resolve the current Clerk user to a persisted Prisma {@link User}, creating
 * or updating the row on demand. Returns null when auth isn't configured or
 * there is no active session (the app's demo mode runs without persistence).
 */
export async function getCurrentDbUser(): Promise<User | null> {
  if (!isAuthConfigured) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await currentUser();
  const email =
    clerk?.emailAddresses?.[0]?.emailAddress ?? `${userId}@users.webflowai.dev`;
  const name =
    [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ") ||
    clerk?.username ||
    null;
  const avatarUrl = clerk?.imageUrl ?? null;

  try {
    return await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email, name, avatarUrl },
      create: { clerkId: userId, email, name, avatarUrl },
    });
  } catch {
    // Email uniqueness collision or transient error — fall back to lookup.
    return prisma.user.findUnique({ where: { clerkId: userId } });
  }
}
