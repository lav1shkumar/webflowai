import { streamText, stepCountIs } from "ai";
import { getModel, isAiConfigured, modelDefaults } from "../model";
import { prompts } from "../prompts";
import { createWorkspaceTools } from "../tools";
import { formatIssues } from "../verifier";
import { languageFromPath } from "../../webcontainer/files";
import type { Agent, AgentContext, FileChange } from "../types";

/**
 * Code Generator Agent — produces complete file contents for the blueprint.
 * Streams tokens for live UI; emits a {@link FileChange} per resolved file.
 */
export const generatorAgent: Agent<FileChange[]> = {
  kind: "generator",
  name: "Code Generator",
  description: "Writes complete, type-safe code for the planned files.",

  async run(ctx: AgentContext) {
    const fixMode = Boolean(
      ctx.verification && !ctx.verification.ok,
    );
    ctx.emit({ type: "phase", agent: "generator", phase: "running" });
    ctx.emit({
      type: "log",
      agent: "generator",
      message: fixMode
        ? "Fixing issues found during verification…"
        : "Generating source files…",
    });

    try {
      const changes = isAiConfigured
        ? fixMode
          ? await streamFix(ctx)
          : await streamGenerated(ctx)
        : scaffoldChanges(ctx);

      for (const change of changes) {
        ctx.emit({ type: "file", agent: "generator", change });
      }
      ctx.changes.push(...changes);
      ctx.emit({ type: "phase", agent: "generator", phase: "succeeded" });
      return { kind: "generator", ok: true, output: changes };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Code generation failed";
      ctx.emit({ type: "error", agent: "generator", message });
      ctx.emit({ type: "phase", agent: "generator", phase: "failed" });
      return { kind: "generator", ok: false, error: message };
    }
  },
};

/** Fix pass: regenerate only the files needed to resolve verifier errors. */
async function streamFix(ctx: AgentContext): Promise<FileChange[]> {
  const report = ctx.verification
    ? formatIssues(ctx.verification)
    : "(no issues)";
  const result = streamText({
    model: getModel(),
    prompt: prompts.generatorFix(ctx, report),
    tools: createWorkspaceTools(ctx, "generator"),
    stopWhen: stepCountIs(8),
    abortSignal: ctx.signal,
    ...modelDefaults,
  });

  let buffer = "";
  for await (const delta of result.textStream) {
    buffer += delta;
    ctx.emit({ type: "token", agent: "generator", text: delta });
  }
  const usage = await result.usage;
  ctx.usage.tokens += usage?.totalTokens ?? 0;
  return parseFileBlocks(buffer, ctx.files);
}

async function streamGenerated(ctx: AgentContext): Promise<FileChange[]> {
  const result = streamText({
    model: getModel(),
    prompt: prompts.generator(ctx),
    tools: createWorkspaceTools(ctx, "generator"),
    stopWhen: stepCountIs(8),
    abortSignal: ctx.signal,
    ...modelDefaults,
  });

  let buffer = "";
  for await (const delta of result.textStream) {
    buffer += delta;
    ctx.emit({ type: "token", agent: "generator", text: delta });
  }
  const usage = await result.usage;
  ctx.usage.tokens += usage?.totalTokens ?? 0;
  const parsed = parseFileBlocks(buffer, ctx.files);
  if (parsed.length > 0) return parsed;
  // Never clobber an existing project with a fresh scaffold when parsing yields
  // nothing — only scaffold for brand-new projects.
  return Object.keys(ctx.files).length === 0 ? scaffoldChanges(ctx) : [];
}

/**
 * Parse fenced file blocks of the form:
 *   ```tsx path=src/app/page.tsx
 *   ...content...
 *   ```
 * A `delete` language marks a removal:
 *   ```delete path=src/Old.tsx
 *   ```
 *
 * Ops are resolved against {@link existing}: a path already in the workspace
 * is an "update", a new path is a "create". This makes generation
 * modify-aware instead of always re-creating files.
 */
function parseFileBlocks(
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
    if (!rawPath || !isValidPath(rawPath) || seen.has(rawPath)) continue;
    seen.add(rawPath);

    if (lang === "delete") {
      // Only emit a delete for a file that actually exists.
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

/** Reject globs, absolute paths, traversal, and obviously non-file tokens. */
function isValidPath(path: string): boolean {
  if (/[*?<>|]/.test(path)) return false;
  if (path.startsWith("/") || path.includes("..")) return false;
  if (path.length > 200) return false;
  return /\.[a-z0-9]+$/i.test(path) || !path.includes(" ");
}

function scaffoldChanges(ctx: AgentContext): FileChange[] {
  const files = ctx.blueprint?.files ?? [];
  return files.map((f) => ({
    path: f.path,
    op: "create" as const,
    language: languageFromPath(f.path),
    content: scaffoldContent(f.path, f.purpose, ctx.prompt),
  }));
}

function scaffoldContent(path: string, purpose: string, prompt: string): string {
  switch (path) {
    case "package.json":
      // Must be valid JSON — npm install parses this first.
      return (
        JSON.stringify(
          {
            name: slugify(prompt),
            version: "0.1.0",
            private: true,
            type: "module",
            description: prompt,
            scripts: { dev: "node server.mjs", start: "node server.mjs" },
          },
          null,
          2,
        ) + "\n"
      );
    case "server.mjs":
      return SERVER_MJS;
    case "public/index.html":
      return indexHtml(htmlEscape(prompt));
    case "public/styles.css":
      return STYLES_CSS;
    case "README.md":
      return `# ${prompt}\n\nGenerated by WebFlowAI.\n\n## Getting started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`;
    default:
      return `// ${path}\n// ${purpose}\n`;
  }
}

/** Slugify a prompt into a safe npm package name. */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "webflowai-app"
  );
}

/** Escape user text for safe inclusion in HTML. */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function indexHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="shell">
      <span class="badge">Built with WebFlowAI</span>
      <h1>${title}</h1>
      <p>
        Your generated application is running live in an in-browser dev server.
        Edit files in the workspace and the preview updates instantly.
      </p>
      <section class="grid">
        <article class="card">
          <h3>Live runtime</h3>
          <p>Real Node.js running in your browser via WebContainers.</p>
        </article>
        <article class="card">
          <h3>Conversational edits</h3>
          <p>Ask the AI to add features, refactor, or fix bugs.</p>
        </article>
        <article class="card">
          <h3>Production-ready</h3>
          <p>Clean architecture and modern, typed patterns.</p>
        </article>
      </section>
    </main>
  </body>
</html>
`;
}

const SERVER_MJS = `import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = process.env.PORT || 3000;
const ROOT = join(process.cwd(), "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    if (pathname === "/") pathname = "/index.html";
    const filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end("<h1>404 — Not found</h1>");
  }
}).listen(PORT, () => {
  console.log(\`Dev server running on http://localhost:\${PORT}\`);
});
`;

const STYLES_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0f1014;
  --card: #16171d;
  --border: #24262e;
  --fg: #f4f4f5;
  --muted: #a1a1aa;
  --accent: #5b7cfa;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: radial-gradient(1000px 500px at 50% -10%, rgba(91, 124, 250, 0.12), transparent), var(--bg);
  color: var(--fg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  -webkit-font-smoothing: antialiased;
}
.shell { max-width: 760px; text-align: center; }
.badge {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--accent);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 999px;
  padding: 6px 12px;
  margin-bottom: 24px;
}
h1 { font-size: 44px; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 16px; }
p { color: var(--muted); font-size: 17px; line-height: 1.6; max-width: 560px; margin: 0 auto; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 40px;
  text-align: left;
}
.card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
.card h3 { font-size: 15px; margin-bottom: 8px; }
.card p { font-size: 14px; }
@media (max-width: 600px) { h1 { font-size: 32px; } }
`;
