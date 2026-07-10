import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Resolve the current Clerk user to a persisted Prisma {@link User}, creating
 * or updating the row on demand. Returns null when there is no active session.
 */
export async function getCurrentDbUser(): Promise<User | null> {
  const LOG = "[user]";
  const t0 = Date.now();

  const { userId } = await auth();
  console.log(`${LOG} auth() -> ${userId ? "userId ok" : "no session"} (${Date.now() - t0}ms)`);
  if (!userId) return null;

  const t1 = Date.now();
  const clerk = await currentUser();
  console.log(`${LOG} currentUser() done (${Date.now() - t1}ms)`);

  const email =
    clerk?.emailAddresses?.[0]?.emailAddress ?? `${userId}@users.webflowai.dev`;
  const name =
    [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ") ||
    clerk?.username ||
    null;
  const avatarUrl = clerk?.imageUrl ?? null;

  const t2 = Date.now();
  try {
    console.log(`${LOG} user.upsert starting...`);
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email, name, avatarUrl },
      create: { clerkId: userId, email, name, avatarUrl },
    });
    console.log(`${LOG} user.upsert OK (${Date.now() - t2}ms)`);
    return user;
  } catch (err) {
    // Email uniqueness collision or transient error — fall back to lookup.
    console.error(`${LOG} user.upsert FAILED after ${Date.now() - t2}ms, falling back to findUnique`, err);
    const t3 = Date.now();
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    console.log(`${LOG} user.findUnique done (${Date.now() - t3}ms), found=${Boolean(user)}`);
    return user;
  }
}
