import type { FileSystemTree } from "@webcontainer/api";

/** A node in the visual file explorer tree. */
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string;
  children?: FileNode[];
}

const EXT_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  yaml: "yaml",
  prisma: "prisma",
  sql: "sql",
  py: "python",
  go: "go",
  rs: "rust",
  sh: "shell",
  env: "dotenv",
};

/** Infer a syntax-highlighting language id from a file path. */
export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANGUAGE[ext] ?? "plaintext";
}

/** Build a nested {@link FileNode} tree from a flat path→content map. */
export function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode = { name: "", path: "", type: "directory", children: [] };

  for (const fullPath of Object.keys(files).sort()) {
    const segments = fullPath.split("/").filter(Boolean);
    let cursor = root;
    let accumulated = "";

    segments.forEach((segment, idx) => {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const isLeaf = idx === segments.length - 1;
      cursor.children ??= [];
      let next = cursor.children.find((c) => c.name === segment);

      if (!next) {
        next = {
          name: segment,
          path: accumulated,
          type: isLeaf ? "file" : "directory",
          ...(isLeaf ? { language: languageFromPath(segment) } : { children: [] }),
        };
        cursor.children.push(next);
      }
      cursor = next;
    });
  }

  // Directories first, then alphabetical.
  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    nodes
      .map((n) =>
        n.children ? { ...n, children: sortNodes(n.children) } : n,
      )
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  return sortNodes(root.children ?? []);
}

/**
 * Convert a flat path→content map into a WebContainer {@link FileSystemTree}
 * suitable for `webcontainer.mount()`.
 */
export function toFileSystemTree(
  files: Record<string, string>,
): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split("/").filter(Boolean);
    let cursor: FileSystemTree = tree;

    segments.forEach((segment, idx) => {
      const isLeaf = idx === segments.length - 1;
      if (isLeaf) {
        cursor[segment] = { file: { contents } };
      } else {
        const existing = cursor[segment];
        if (existing && "directory" in existing) {
          cursor = existing.directory;
        } else {
          const dir: FileSystemTree = {};
          cursor[segment] = { directory: dir };
          cursor = dir;
        }
      }
    });
  }

  return tree;
}


/**
 * Replace shell parameter expansions (e.g. `${PORT:-3000}`, `$PORT`) with a
 * literal port. The WebContainer shell (`jsh`) doesn't perform default-value
 * expansion, so `next dev -p ${PORT:-3000}` would pass an empty `-p` value
 * and crash. We normalize to a fixed port the preview can map.
 */
function replacePortExpansions(text: string): string {
  return text
    .replace(/\$\{PORT:-(\d+)\}/g, "$1")
    .replace(/\$\{PORT(:-)?\}/g, "3000")
    .replace(/\$\{PORT\}/g, "3000")
    .replace(/\$PORT\b/g, "3000");
}

/**
 * Make a generated `package.json` runnable inside the WebContainer:
 * normalize port expansions in its scripts. Falls back to a raw string
 * replacement if the JSON can't be parsed.
 */
export function sanitizePackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content) as {
      scripts?: Record<string, string>;
    };
    if (pkg.scripts) {
      for (const key of Object.keys(pkg.scripts)) {
        const value = pkg.scripts[key];
        if (typeof value === "string") {
          pkg.scripts[key] = replacePortExpansions(value);
        }
      }
      return JSON.stringify(pkg, null, 2) + "\n";
    }
    return content;
  } catch {
    return replacePortExpansions(content);
  }
}

/** Normalize a project's files for the WebContainer runtime. */
export function normalizeProjectFiles(
  files: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[path] =
      path === "package.json" || path.endsWith("/package.json")
        ? sanitizePackageJson(content)
        : content;
  }
  return out;
}
