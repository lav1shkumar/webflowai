import { toast } from "sonner";

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super(
      retryAfter > 0
        ? `Too many requests. Try again in ${retryAfter}s.`
        : "Too many requests. Please try again shortly.",
    );
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Toasts and throws when a request was rate limited. Toasting here rather than
 * in each caller means paths that swallow errors still surface the limit.
 */
export function throwIfRateLimited(response: Response): void {
  if (response.status !== 429) return;

  const retryAfter = Number(response.headers.get("Retry-After")) || 0;

  toast.error("Too many requests", {
    id: "rate-limited",
    description:
      retryAfter > 0
        ? `You're going a bit fast. Try again in ${retryAfter} seconds.`
        : "You're going a bit fast. Please try again shortly.",
  });

  throw new RateLimitError(retryAfter);
}
