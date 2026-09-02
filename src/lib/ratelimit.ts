import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";
import { TokenBucket } from "@/server/tokenbucket";

const EXEMPT = ["/api/webhooks"];

const LIMIT = { capacity: 20, refillRate: 1, refillInterval: 2 };

let bucket: TokenBucket | undefined;

/**
 * Consumes one token for the caller, keyed by user when signed in and by hashed
 * IP otherwise. Allows the request through if Redis is unavailable.
 */
export async function checkRateLimit(
  pathname: string,
  userId: string | null,
  ip: string,
): Promise<{ allowed: boolean; retryAfter: number }> {
  if (EXEMPT.some((p) => pathname.startsWith(p))) {
    return { allowed: true, retryAfter: 0 };
  }

  const identity = userId
    ? `u:${userId}`
    : `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 16)}`;

  try {
    const client = await getRedis();
    bucket ??= new TokenBucket({ ...LIMIT, redisClient: client });
    // getRedis() hands back a new client after a restart; without this the
    // bucket keeps using the dead one and every request slips through.
    bucket.redis = client;
    const { allowed } = await bucket.allow(`rl:${identity}`);
    return { allowed, retryAfter: allowed ? 0 : LIMIT.refillInterval };
  } catch (err) {
    console.error("[ratelimit] Redis unavailable, allowing request:", err);
    return { allowed: true, retryAfter: 0 };
  }
}
