/** A single file change produced by generation. */
export interface FileChange {
  path: string;
  op: "create" | "update" | "delete";
  content?: string;
}

export type GenerationStage =
  | "context"
  | "planning"
  | "generation"
  | "verification"
  | "preview";

export interface GenerationActivity {
  id: string;
  stage: GenerationStage;
  kind: "inspect" | "plan" | "file" | "command";
  label: string;
  status: "running" | "done" | "error";
  path?: string;
}

/** Events streamed from the generation API to the workspace UI. */
export type GenerationEvent =
  | { type: "status"; status: "running" | "succeeded" | "failed" }
  | { type: "log"; message: string }
  | {
      type: "stage";
      stage: GenerationStage;
      message: string;
    }
  | { type: "activity"; activity: GenerationActivity }
  | {
      type: "done";
      summary: string;
      tokensUsed: number;
      tokensRemaining: number | null;
      signedIn: boolean;
      files: string[];
      previewUrl: string;
    }
  | { type: "error"; message: string };
