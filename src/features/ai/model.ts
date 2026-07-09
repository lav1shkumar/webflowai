import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "@/lib/env";

const vertex = createVertex({
  apiKey: env.vertexApiKey,
});

export function getModel(modelId: string = env.aiModel) {
  if (!env.vertexApiKey) {
    throw new Error("GOOGLE_VERTEX_API_KEY is not configured.");
  }
  return vertex(modelId);
}

export const modelDefaults = {
  temperature: 1,
} as const;
