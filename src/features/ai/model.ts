import { createAzure } from "@ai-sdk/azure";
import { env, isAiConfigured } from "@/lib/env";

/**
 * Model provider abstraction.
 *
 * This project targets Azure OpenAI. The rest of the codebase only depends on
 * `getModel`, so swapping to standard OpenAI / Anthropic / a gateway is a
 * one-file change. `modelId` is the Azure **deployment** name (set via
 * `WEBFLOWAI_MODEL`); credentials come from `OPENAI_API_KEY`.
 */
const azure = createAzure({
  resourceName: env.azureResourceName,
  apiKey: env.openaiApiKey ?? "",
});

export function getModel(modelId: string = env.aiModel) {
  return azure(modelId);
}

/**
 * Default generation settings applied to every agent model call.
 * GPT-5-class deployments only accept the default temperature (1), and the
 * AI SDK otherwise sends 0 — so we set it explicitly here in one place.
 */
export const modelDefaults = {
  temperature: 1,
} as const;

export { isAiConfigured };
