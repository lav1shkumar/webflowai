"use server";

import { getCurrentDbUser } from "@/server/user";

export interface CreditsInfo {
  /** Whether the viewer is a persisted, signed-in user (metering applies). */
  signedIn: boolean;
  balance: number;
  monthly: number;
}

/**
 * Current credit balance for the signed-in user. Demo/anonymous sessions are
 * unmetered, reported as `signedIn: false` so the UI never gates them.
 */
export async function getCredits(): Promise<CreditsInfo> {
  const user = await getCurrentDbUser();
  if (!user) return { signedIn: false, balance: 0, monthly: 0 };
  return {
    signedIn: true,
    balance: user.creditsBalance,
    monthly: user.creditsMonthly,
  };
}
