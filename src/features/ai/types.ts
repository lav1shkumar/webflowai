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
  | { type: "file"; change: FileChange }
  | {
      type: "done";
      summary: string;
      creditsUsed: number;
      creditsRemaining: number | null;
      signedIn: boolean;
    }
  | { type: "error"; message: string };
