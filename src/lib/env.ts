/**
 * Centralized, typed access to environment variables.
 * Server-only secrets are read lazily so the marketing site can build
 * without a fully provisioned backend.
 */

function optional(key: string): string | undefined {
  return process.env[key];
}

/** Return the first env var (by key) that has a non-empty, trimmed value. */
function firstNonEmpty(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value;
  }
  return undefined;
}

export const env = {
  // AI — accept the standard OpenAI var or the Azure-specific one, whichever
  // is non-empty (ignores blank placeholders).
  openaiApiKey: firstNonEmpty("OPENAI_API_KEY", "AZURE_OPENAI_API_KEY"),
  aiModel: optional("WEBFLOWAI_MODEL") ?? "gpt-4o-mini",
  // Azure OpenAI resource name (the part before .openai.azure.com).
  azureResourceName: optional("AZURE_RESOURCE_NAME") ?? "genai-lav1sh-resource",

  // Clerk
  clerkPublishableKey: optional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: optional("CLERK_SECRET_KEY"),

  // Razorpay
  razorpayKeyId: optional("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optional("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),

  // Runtime
  isProd: process.env.NODE_ENV === "production",
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
} as const;

/** Whether the AI backend is configured. Used to gate live calls vs. demo mode. */
export const isAiConfigured = Boolean(env.openaiApiKey);
/** Whether Clerk is configured. Lets the app render in a public demo mode. */
export const isAuthConfigured = Boolean(
  env.clerkPublishableKey && env.clerkSecretKey,
);
