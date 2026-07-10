/**
 * Centralized, typed access to environment variables.
 * Server-only secrets are read lazily so the marketing site can build
 * without a fully provisioned backend.
 */

function optional(key: string): string | undefined {
  return process.env[key];
}


export const env = {

  vertexApiKey: optional("GOOGLE_VERTEX_API_KEY"),
  aiModel: optional("WEBFLOWAI_MODEL") ?? "gemini-2.5-flash",

  clerkPublishableKey: optional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: optional("CLERK_SECRET_KEY"),

  razorpayKeyId: optional("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optional("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),

} as const;
