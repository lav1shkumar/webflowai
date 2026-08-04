import { buildCodebaseContext } from "./context";

/**
 * Prompt templates for the generator. Kept separate from the pipeline logic
 * in generate.ts so that file is easy to read.
 */

const OUTPUT_FORMAT = `OUTPUT FORMAT — emit ONLY fenced code blocks, one per file:

\`\`\`tsx path=app/page.tsx
// full file contents here
\`\`\`

To delete a file:
\`\`\`delete path=app/old-page.tsx
\`\`\``;

const TOOLS = `TOOLS — you have read access to the workspace:
- list_files(): see all files in the project.
- read_file({ path }): read a file's contents.
- search_files({ query }): search across files.`;

/** The main generate/modify prompt. */
export function buildPrompt(
  prompt: string,
  files: Record<string, string>,
): string {
  const isNew = Object.keys(files).length === 0;

  const mode = isNew
    ? `You are building a NEW app from scratch.
Create a Next.js + React + TypeScript app using the App Router (runs in a remote E2B sandbox).
Include all required files: package.json, next.config.ts, tsconfig.json, app/layout.tsx, app/page.tsx, app/globals.css, plus components as needed.
The "dev" script must be exactly: next dev
Use Server Components by default and add "use client" only when browser APIs, state, or effects require it.`
    : `You are MODIFYING an existing codebase.
Make the smallest set of changes that fully satisfies the request.
Read files with the read_file tool before modifying them. Only emit files you change or create.`;

  return `You are WebFlowAI, an AI code generator. Write complete, production-quality code.

${mode}

${TOOLS}

${buildCodebaseContext(files)}

User request:
"""${prompt}"""

${OUTPUT_FORMAT}

Rules:
- Emit the COMPLETE contents of every file you create or change.
- Do NOT emit unchanged files.
- No commentary outside of code blocks.`;
}
