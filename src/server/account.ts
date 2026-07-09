"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update the signed-in user's profile. The display name is written to Clerk
 * (the identity source of truth, so it survives re-sync) and mirrored to the
 * database alongside the bio.
 */
export async function updateProfile(input: {
  name: string;
  bio?: string;
}): Promise<ActionResult> {
  const user = await getCurrentDbUser();
  const { userId } = await auth();
  if (!user || !userId) {
    return { ok: false, error: "Not authenticated." };
  }

  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "Name can't be empty." };
  }
  const bio = input.bio?.trim() ?? null;

  // Update Clerk (source of truth for name) so it persists across syncs.
  try {
    const [firstName, ...rest] = name.split(/\s+/);
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      firstName: firstName ?? name,
      lastName: rest.join(" ") || undefined,
    });
  } catch {
    // Non-fatal: still persist to our database below.
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name, bio },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
