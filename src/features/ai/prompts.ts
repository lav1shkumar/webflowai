import { buildCodebaseContext } from "./context";

/**
 * Prompt templates for the generator. Kept separate from the pipeline logic
 * in generate.ts so that file is easy to read.
 */

const OUTPUT_FORMAT = `OUTPUT FORMAT — emit ONLY fenced code blocks, one per file:

\`\`\`tsx path=src/App.tsx
// full file contents here
\`\`\`

To delete a file:
\`\`\`delete path=src/Old.tsx
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
Create a Vite + React + TypeScript single-page app (runs in a WebContainer — no SSR/Next.js).
Include all required files: package.json, vite.config.ts, index.html, tsconfig.json, src/main.tsx, src/App.tsx, plus components as needed.
The "dev" script must be exactly: vite --host --port 3000`
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

/** The fix prompt used when the verifier reports errors. */
export function buildFixPrompt(
  prompt: string,
  files: Record<string, string>,
  issueReport: string,
): string {
  return `You are WebFlowAI. A verifier found errors in the code you generated. Fix EVERY error below with the smallest possible changes. Do not redesign or add features — only fix the issues.

ERRORS:
${issueReport}

${TOOLS}

${buildCodebaseContext(files)}

Original request (for context only):
"""${prompt}"""

OUTPUT FORMAT — emit ONLY fenced code blocks for files you fix:
\`\`\`tsx path=src/App.tsx
// full corrected file contents
\`\`\``;
}
