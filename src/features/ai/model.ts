import { createVertex } from "@ai-sdk/google-vertex";
import { env, isAiConfigured } from "@/lib/env";


const vertex = createVertex({
  apiKey: env.vertexApiKey,
});

export function getModel(modelId: string = env.aiModel) {
  return vertex(modelId);
}

export const modelDefaults = {
  temperature: 1,
} as const;

export { isAiConfigured };
