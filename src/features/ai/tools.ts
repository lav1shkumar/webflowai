import { tool, type Tool } from "ai";
import { z } from "zod";
import { buildRepoMap, relevantPaths } from "./context";
import { languageFromPath } from "../webcontainer/files";
import type { AgentContext, AgentKind, ToolName } from "./types";

/**
 * Workspace file tools — the agent's hands on the codebase.
 *
 * These let a model *request to see files on demand* instead of relying solely
 * on what we pre-pack into the prompt. That keeps prompts small on large
 * projects while still giving the agent full read access through a bounded,
 * auditable surface. Every call emits a {@link AgentEvent} of type `tool` so
 * the workspace UI can show "Reading src/App.tsx…" live.
 *
 * Read-only by design: tools never mutate the workspace. All file writes still
 * flow through the generator → file-operation chokepoint, which keeps changes
 * reviewable.
 */

const MAX_READ_CHARS = 24_000;
const MAX_SEARCH_RESULTS = 40;

/** Build the tool set bound to a specific pipeline context. */
export function createWorkspaceTools(
  ctx: AgentContext,
  agent: AgentKind,
): Record<ToolName, Tool> {
  const emitTool = (toolName: ToolName, detail: string) =>
    ctx.emit({ type: "tool", agent, tool: toolName, detail });

  const list_files = tool({
    description:
      "List every file in the current project workspace as a repository map " +
      "(path, language, size). Call this first to discover what exists before " +
      "deciding what to read or change.",
    inputSchema: z.object({}),
    execute: async () => {
      emitTool("list_files", "Listing workspace files");
      const paths = relevantPaths(ctx.files);
      return {
        fileCount: paths.length,
        repoMap: buildRepoMap(ctx.files),
      };
    },
  });

  const read_file = tool({
    description:
      "Read the full current contents of a single file in the workspace by its " +
      "exact path (as shown by list_files). Use this to inspect code before " +
      "modifying it, so your edits preserve existing structure and behavior.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("Exact workspace-relative file path, e.g. 'src/App.tsx'."),
    }),
    execute: async ({ path }) => {
      emitTool("read_file", `Reading ${path}`);
      const content = ctx.files[path];
      if (content === undefined) {
        const suggestions = relevantPaths(ctx.files)
          .filter((p) => p.endsWith(path.split("/").pop() ?? path))
          .slice(0, 5);
        return {
          found: false,
          path,
          error: `No file at '${path}'.`,
          suggestions,
        };
      }
      const truncated = content.length > MAX_READ_CHARS;
      return {
        found: true,
        path,
        language: languageFromPath(path),
        bytes: content.length,
        truncated,
        content: truncated ? content.slice(0, MAX_READ_CHARS) : content,
      };
    },
  });

  const search_files = tool({
    description:
      "Search file contents across the workspace for a substring or regular " +
      "expression. Returns matching files with line numbers and snippets. Use " +
      "this to locate where a symbol, component, or string is defined or used.",
    inputSchema: z.object({
      query: z.string().describe("Substring or regex to search for."),
      isRegex: z
        .boolean()
        .optional()
        .describe("Treat the query as a regular expression (default false)."),
    }),
    execute: async ({ query, isRegex }) => {
      emitTool("search_files", `Searching for "${query}"`);
      let matcher: RegExp;
      try {
        matcher = isRegex
          ? new RegExp(query, "gi")
          : new RegExp(escapeRegExp(query), "gi");
      } catch {
        return { error: `Invalid regex: ${query}`, matches: [] };
      }

      const matches: {
        path: string;
        line: number;
        text: string;
      }[] = [];

      for (const path of relevantPaths(ctx.files)) {
        const lines = (ctx.files[path] ?? "").split("\n");
        for (let i = 0; i < lines.length; i++) {
          matcher.lastIndex = 0;
          if (matcher.test(lines[i] ?? "")) {
            matches.push({
              path,
              line: i + 1,
              text: (lines[i] ?? "").trim().slice(0, 200),
            });
            if (matches.length >= MAX_SEARCH_RESULTS) break;
          }
        }
        if (matches.length >= MAX_SEARCH_RESULTS) break;
      }

      return {
        query,
        matchCount: matches.length,
        truncated: matches.length >= MAX_SEARCH_RESULTS,
        matches,
      };
    },
  });

  return { list_files, read_file, search_files };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
