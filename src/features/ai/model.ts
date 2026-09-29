import { ChatOpenAI } from "@langchain/openai";

export function getAgentModel(
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

  return new ChatOpenAI({
    model: modelId,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    configuration: {
      baseURL: `https://${process.env.AZURE_RESOURCE_NAME}.openai.azure.com/openai/v1/`,
    },

    useResponsesApi: true,
    maxRetries: 2,
  });
}
