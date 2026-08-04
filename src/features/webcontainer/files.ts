import type { FileSystemTree } from "@webcontainer/api";

/** A node in the visual file explorer tree. */
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
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

    for (const [index, segment] of segments.entries()) {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const isLeaf = index === segments.length - 1;
      cursor.children ??= [];

      let next = cursor.children.find((child) => child.name === segment);

      if (!next) {
        next = {
          name: segment,
          path: accumulated,
          type: isLeaf ? "file" : "directory",
          ...(!isLeaf ? { children: [] } : {}),
        };
        cursor.children.push(next);
      }
      cursor = next;
    }
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

    for (const [index, segment] of segments.entries()) {
      const isLeaf = index === segments.length - 1;
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
    }
  }

  return tree;
}
