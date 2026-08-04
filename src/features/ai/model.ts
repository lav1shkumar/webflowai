import { createAzure } from "@ai-sdk/azure";

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export function getModel(
  modelId: string | undefined = process.env.WEBFLOWAI_MODEL,
) {
  if (!process.env.AZURE_OPENAI_API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY is not configured.");
  }
  if (!process.env.AZURE_RESOURCE_NAME) {
    throw new Error("AZURE_RESOURCE_NAME is not configured.");
  }
  if (!modelId) {
    throw new Error("WEBFLOWAI_MODEL must be an Azure deployment name.");
  }
  return azure(modelId);
}

export const modelDefaults = {
  providerOptions: {
    openai: {
      reasoningEffort: "high",
    },
  },
} as const;
