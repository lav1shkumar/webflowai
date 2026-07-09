export interface VerificationIssue {
  severity: "error" | "warning";
  kind: "syntax" | "import" | "json" | "dependency" | "config";
  path: string;
  message: string;
  line?: number;
}

export interface VerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
  checked: number;
}

/**
 * Deterministic workspace verifier — the pipeline's *real* validation gate.
 *
 * Unlike the LLM Reviewer (which gives a second opinion in prose), the verifier
 * mechanically inspects the generated files for concrete, runnable-or-not
 * defects and produces precise, actionable errors that drive an automated fix
 * loop. It is fast, has no false positives from missing node_modules (it never
 * does type resolution), and runs entirely server-side.
 *
 * Checks performed:
 *  1. Syntax — every TS/TSX/JS/JSX file is parsed; syntactic diagnostics
 *     (unbalanced braces, bad tokens, malformed JSX) become errors.
 *  2. JSON validity — every .json file must parse; package.json gets extra
 *     structural checks.
 *  3. Local imports — relative imports (./x, ../y) must resolve to a file that
 *     actually exists in the workspace (a very common LLM omission).
 *  4. Dependencies — bare package imports should be declared in package.json
 *     (advisory warning, since some are provided by the runtime).
 */

const CODE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const RESOLVE_EXTS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".svg",
];

/** Node/runtime builtins and well-known globals we never flag as missing deps. */
const KNOWN_RUNTIME = new Set([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react-dom/client",
]);

export async function verifyWorkspace(
  files: Record<string, string>,
): Promise<VerificationResult> {
  const issues: VerificationIssue[] = [];
  const paths = Object.keys(files);
  let checked = 0;

  // Lazily load the TS compiler (server-only, keeps it out of client bundles).
  let ts: typeof import("typescript") | null = null;
  try {
    const mod = await import("typescript");
    // `typescript` is a CommonJS module; the namespace is on the module itself,
    // but under some bundlers it's nested on `.default`. Handle both.
    ts =
      (mod as unknown as { default?: typeof import("typescript") }).default ??
      mod;
  } catch {
    ts = null; // fall back to brace-balance heuristic below
  }

  const deps = collectDependencies(files["package.json"]);

  for (const path of paths) {
    const content = files[path] ?? "";

    if (path.endsWith(".json")) {
      checked++;
      issues.push(...checkJson(path, content));
      continue;
    }

    if (CODE_EXTS.some((e) => path.endsWith(e))) {
      checked++;
      issues.push(...checkSyntax(ts, path, content));
      issues.push(...checkLocalImports(path, content, files));
      issues.push(...checkBareImports(path, content, deps));
    }
  }

  const hasError = issues.some((i) => i.severity === "error");
  return { ok: !hasError, issues, checked };
}

/* ------------------------------------------------------------------ */
/* Syntax                                                              */
/* ------------------------------------------------------------------ */

function checkSyntax(
  ts: typeof import("typescript") | null,
  path: string,
  content: string,
): VerificationIssue[] {
  if (!ts) return braceBalanceHeuristic(path, content);

  const scriptKind = path.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : path.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : path.endsWith(".ts")
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;

  // Parser only — no type checking, no lib loading, no module resolution.
  const sf = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    scriptKind,
  );

  // `parseDiagnostics` is internal but stable; it holds syntactic errors.
  const diags =
    (sf as unknown as { parseDiagnostics?: import("typescript").Diagnostic[] })
      .parseDiagnostics ?? [];

  const issues: VerificationIssue[] = [];
  for (const d of diags.slice(0, 5)) {
    const message =
      typeof d.messageText === "string"
        ? d.messageText
        : d.messageText.messageText;
    let line: number | undefined;
    if (typeof d.start === "number") {
      line = sf.getLineAndCharacterOfPosition(d.start).line + 1;
    }
    issues.push({ severity: "error", kind: "syntax", path, message, line });
  }
  return issues;
}

/** Fallback when the TS compiler can't be loaded: catch gross imbalance. */
function braceBalanceHeuristic(
  path: string,
  content: string,
): VerificationIssue[] {
  const stripped = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const pairs: [string, string][] = [
    ["{", "}"],
    ["(", ")"],
    ["[", "]"],
  ];
  const issues: VerificationIssue[] = [];
  for (const [open, close] of pairs) {
    const o = stripped.split(open).length - 1;
    const c = stripped.split(close).length - 1;
    if (o !== c) {
      issues.push({
        severity: "error",
        kind: "syntax",
        path,
        message: `Unbalanced '${open}${close}' (${o} open vs ${c} close).`,
      });
    }
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

function checkJson(path: string, content: string): VerificationIssue[] {
  try {
    const parsed = JSON.parse(content);
    if (path.endsWith("package.json")) {
      const issues: VerificationIssue[] = [];
      if (!parsed || typeof parsed !== "object") {
        issues.push({
          severity: "error",
          kind: "json",
          path,
          message: "package.json must be a JSON object.",
        });
        return issues;
      }
      const scripts = (parsed as { scripts?: Record<string, string> }).scripts;
      if (!scripts || !scripts.dev) {
        issues.push({
          severity: "warning",
          kind: "config",
          path,
          message: 'package.json is missing a "dev" script.',
        });
      }
      return issues;
    }
    return [];
  } catch (err) {
    return [
      {
        severity: "error",
        kind: "json",
        path,
        message: `Invalid JSON: ${
          err instanceof Error ? err.message : "parse error"
        }.`,
      },
    ];
  }
}

/* ------------------------------------------------------------------ */
/* Imports                                                             */
/* ------------------------------------------------------------------ */

const IMPORT_RE =
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

function extractImports(content: string): string[] {
  const specs: string[] = [];
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(content)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) specs.push(spec);
  }
  return specs;
}

function checkLocalImports(
  path: string,
  content: string,
  files: Record<string, string>,
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const spec of extractImports(content)) {
    if (!spec.startsWith(".")) continue; // only relative imports are local
    if (!resolveLocal(path, spec, files)) {
      issues.push({
        severity: "error",
        kind: "import",
        path,
        message: `Import '${spec}' does not resolve to any file in the workspace. Create the target file or fix the path.`,
      });
    }
  }
  return issues;
}

/** Resolve a relative import against the set of existing workspace paths. */
function resolveLocal(
  fromPath: string,
  spec: string,
  files: Record<string, string>,
): boolean {
  const baseDir = fromPath.includes("/")
    ? fromPath.slice(0, fromPath.lastIndexOf("/"))
    : "";
  const joined = normalizePath(baseDir, spec);

  // Exact match (import already includes extension).
  if (files[joined] !== undefined) return true;
  // Try appending known extensions.
  for (const ext of RESOLVE_EXTS) {
    if (files[joined + ext] !== undefined) return true;
  }
  // Try as a directory with an index file.
  for (const ext of RESOLVE_EXTS) {
    if (files[`${joined}/index${ext}`] !== undefined) return true;
  }
  return false;
}

/** Join + normalize a POSIX-style relative path (handles ./ and ../). */
function normalizePath(baseDir: string, spec: string): string {
  const parts = (baseDir ? baseDir.split("/") : []).concat(spec.split("/"));
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function collectDependencies(pkgJson: string | undefined): Set<string> {
  const deps = new Set<string>();
  if (!pkgJson) return deps;
  try {
    const parsed = JSON.parse(pkgJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    for (const group of [
      parsed.dependencies,
      parsed.devDependencies,
      parsed.peerDependencies,
    ]) {
      if (group) for (const name of Object.keys(group)) deps.add(name);
    }
  } catch {
    /* invalid package.json is reported separately by checkJson */
  }
  return deps;
}

function checkBareImports(
  path: string,
  content: string,
  deps: Set<string>,
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const spec of extractImports(content)) {
    if (spec.startsWith(".") || spec.startsWith("/")) continue; // local
    if (spec.startsWith("node:")) continue; // node builtin
    const pkg = packageNameOf(spec);
    if (KNOWN_RUNTIME.has(spec) || KNOWN_RUNTIME.has(pkg)) continue;
    if (!deps.has(pkg)) {
      issues.push({
        severity: "warning",
        kind: "dependency",
        path,
        message: `Imports '${spec}' but '${pkg}' is not in package.json dependencies. Add it or remove the import.`,
      });
    }
  }
  return issues;
}

/** Extract the installable package name from an import specifier. */
function packageNameOf(spec: string): string {
  if (spec.startsWith("@")) {
    const [scope, name] = spec.split("/");
    return name ? `${scope}/${name}` : spec;
  }
  return spec.split("/")[0] ?? spec;
}

/**
 * Render verification issues as a compact, model-friendly report used to brief
 * the fix pass. Errors first, then warnings; grouped per file.
 */
export function formatIssues(result: VerificationResult): string {
  const lines: string[] = [];
  const ordered = [...result.issues].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
  for (const issue of ordered) {
    const loc = issue.line ? `${issue.path}:${issue.line}` : issue.path;
    lines.push(
      `- [${issue.severity}] (${issue.kind}) ${loc} — ${issue.message}`,
    );
  }
  return lines.join("\n");
}
