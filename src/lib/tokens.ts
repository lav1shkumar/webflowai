const MODEL_TOKENS_PER_USAGE_TOKEN = 1000;

export function usageTokensForModelTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.ceil(tokens / MODEL_TOKENS_PER_USAGE_TOKEN));
}
