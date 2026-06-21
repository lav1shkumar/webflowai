/**
 * Token-based credit accounting.
 *
 * AI generations are metered in model tokens; users are billed in credits.
 * One credit covers {@link TOKENS_PER_CREDIT} tokens (prompt + completion),
 * with a 1-credit floor so every generation costs at least something.
 */
export const TOKENS_PER_CREDIT = 1000;

/** Convert a total token count into the number of credits to charge. */
export function creditsForTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}
