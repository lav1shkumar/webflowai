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
    // Log the full error so the real cause (connection, TLS, constraint) is
    // visible in the console instead of being silently swallowed.
    console.error(`${LOG} user.upsert FAILED after ${Date.now() - t2}ms`, err);

    // Fall back to a plain read (handles e.g. an email uniqueness collision on
    // create). If this ALSO fails, rethrow so the error surfaces rather than
    // returning null and triggering a redirect loop.
    const t3 = Date.now();
    try {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      console.log(`${LOG} user.findUnique done (${Date.now() - t3}ms), found=${Boolean(user)}`);
      if (user) return user;
      // Signed in with Clerk but no row and we couldn't create one: this is a
      // real error, not an "unauthenticated" state. Surface it.
      throw new Error(
        `No DB user for clerkId=${userId} and upsert failed; see the upsert error above.`,
      );
    } catch (err2) {
      console.error(`${LOG} user.findUnique FAILED after ${Date.now() - t3}ms`, err2);
      throw err2;
    }
  }
}
