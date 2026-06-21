import "server-only";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/env";
import { getCurrentDbUser } from "@/server/user";
import { demoUser, demoUsage } from "@/lib/mock-data";

export interface Viewer {
  signedIn: boolean;
  authConfigured: boolean;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  initials: string;
  plan: "FREE" | "PRO" | "TEAM";
  creditsBalance: number;
  creditsMonthly: number;
}

function initialsFrom(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Resolve the current viewer for UI display. Returns the real Clerk-backed
 * user when signed in; otherwise a demo identity so the app stays explorable
 * without authentication.
 */
export async function getViewer(): Promise<Viewer> {
  const user = await getCurrentDbUser();

  if (!user) {
    return {
      signedIn: false,
      authConfigured: isAuthConfigured,
      name: demoUser.name,
      email: demoUser.email,
      avatarUrl: null,
      bio: "",
      initials: demoUser.initials,
      plan: demoUser.plan,
      creditsBalance: demoUsage.creditsBalance,
      creditsMonthly: demoUsage.creditsMonthly,
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true },
  });

  const name = user.name?.trim() || user.email.split("@")[0] || "Member";
  return {
    signedIn: true,
    authConfigured: isAuthConfigured,
    name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? "",
    initials: initialsFrom(name),
    plan: (subscription?.plan ?? "FREE") as Viewer["plan"],
    creditsBalance: user.creditsBalance,
    creditsMonthly: user.creditsMonthly,
  };
}
