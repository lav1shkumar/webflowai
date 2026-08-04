"use server";

import { getCurrentDbUser } from "@/server/user";

export interface TokensInfo {
  signedIn: boolean;
  balance: number;
}

export async function getTokens(): Promise<TokensInfo> {
  const user = await getCurrentDbUser();
  if (!user) return { signedIn: false, balance: 0 };
  return { signedIn: true, balance: user.tokensBalance };
}
