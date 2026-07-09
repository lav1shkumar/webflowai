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
  // AI — Google Vertex AI (express-mode API key).
  vertexApiKey: firstNonEmpty("GOOGLE_VERTEX_API_KEY"),
  aiModel: optional("WEBFLOWAI_MODEL") ?? "gemini-2.5-flash",

  // Clerk
  clerkPublishableKey: optional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: optional("CLERK_SECRET_KEY"),

  // Razorpay
  razorpayKeyId: optional("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optional("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),

  // Runtime
  isProd: process.env.NODE_ENV === "production",
} as const;
