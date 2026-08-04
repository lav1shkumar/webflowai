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

export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANGUAGE[ext] ?? "plaintext";
}

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

  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    nodes
      .map((node) =>
        node.children ? { ...node, children: sortNodes(node.children) } : node,
      )
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  return sortNodes(root.children ?? []);
}
