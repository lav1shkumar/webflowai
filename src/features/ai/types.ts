/** A single file change produced by generation. */
export interface FileChange {
  path: string;
  op: "create" | "update" | "delete";
  content?: string;
}

/** Events streamed from the generation API to the workspace UI. */
export type GenerationEvent =
  | { type: "status"; status: "running" | "succeeded" | "failed" }
  | { type: "log"; message: string }
  | {
      type: "stage";
      stage: "context" | "planning" | "generation" | "verification";
      message: string;
    }
  | {
      type: "done";
      summary: string;
      tokensUsed: number;
      tokensRemaining: number | null;
      signedIn: boolean;
    }
  | { type: "error"; message: string };
