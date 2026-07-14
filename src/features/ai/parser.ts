import { languageFromPath } from "../webcontainer/files";
import type { FileChange } from "./types";

/**
 * Turns the model's raw text response into structured file changes.
 * Kept separate from the pipeline logic in generate.ts.
 */

/**
 * Parse fenced file blocks from the model response.
 * Format: ```language path=relative/path\n...content...\n```
 */
export function parseFileBlocks(
  text: string,
  existing: Record<string, string>,
): FileChange[] {
  const changes: FileChange[] = [];
  const seen = new Set<string>();
  const re = /```([a-z0-9]*)\s+path=([^\n]+)\n([\s\S]*?)```/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const lang = (match[1] ?? "").toLowerCase();
    const rawPath = match[2]?.trim().replace(/^["'`]|["'`]$/g, "");
    const content = match[3] ?? "";

    if (!rawPath || seen.has(rawPath)) continue;
    if (!isValidPath(rawPath)) continue;
    seen.add(rawPath);

    if (lang === "delete") {
      if (existing[rawPath] !== undefined) {
        changes.push({ path: rawPath, op: "delete" });
      }
      continue;
    }

    changes.push({
      path: rawPath,
      op: existing[rawPath] !== undefined ? "update" : "create",
      content,
      language: languageFromPath(rawPath),
    });
  }

  return changes;
}

/** Reject unsafe or malformed paths before we write them to the workspace. */
function isValidPath(path: string): boolean {
  if (/[*?<>|]/.test(path)) return false;
  if (path.startsWith("/") || path.includes("..")) return false;
  if (path.length > 200) return false;
  return /\.[a-z0-9]+$/i.test(path) || !path.includes(" ");
}
