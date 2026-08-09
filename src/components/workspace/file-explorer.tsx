"use client";

import * as React from "react";
import {
  ChevronRight,
  File as FileIcon,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/store";
import type { FileNode } from "@/features/workspace/files";
import { cn } from "@/lib/utils";

/** Placeholder used to materialize empty folders; hidden from the tree UI. */
const FOLDER_KEEP = ".gitkeep";

type CreateKind = "file" | "folder";
type EditState =
  | { mode: "create"; parent: string; kind: CreateKind }
  | { mode: "rename"; path: string }
  | null;

interface ExplorerCtx {
  edit: EditState;
  startCreate: (parent: string, kind: CreateKind) => void;
  submitCreate: (name: string) => void;
  startRename: (path: string) => void;
  submitRename: (path: string, kind: CreateKind, name: string) => void;
  cancel: () => void;
}

const ExplorerContext = React.createContext<ExplorerCtx | null>(null);
const useExplorer = (): ExplorerCtx => {
  const ctx = React.useContext(ExplorerContext);
  if (!ctx) throw new Error("ExplorerContext missing");
  return ctx;
};

export function FileExplorer() {
  const tree = useWorkspace((s) => s.tree);
  const createFile = useWorkspace((s) => s.createFile);
  const createFolder = useWorkspace((s) => s.createFolder);
  const renameFile = useWorkspace((s) => s.renameFile);
  const renameFolder = useWorkspace((s) => s.renameFolder);
  const [query, setQuery] = React.useState("");
  const [edit, setEdit] = React.useState<EditState>(null);

  const filtered = React.useMemo(
    () => (query ? filterTree(tree, query.toLowerCase()) : tree),
    [tree, query],
  );

  const ctx = React.useMemo<ExplorerCtx>(
    () => ({
      edit,
      startCreate: (parent, kind) =>
        setEdit({ mode: "create", parent, kind }),
      submitCreate: (name) => {
        if (edit?.mode !== "create") return;
        const trimmed = name.trim().replace(/^\/+|\/+$/g, "");
        if (!trimmed) {
          setEdit(null);
          return;
        }
        const base = edit.parent ? `${edit.parent}/` : "";
        const fullPath = `${base}${trimmed}`;
        if (edit.kind === "folder") createFolder(fullPath);
        else createFile(fullPath);
        setEdit(null);
      },
      startRename: (path) => setEdit({ mode: "rename", path }),
      submitRename: (path, kind, name) => {
        const trimmed = name.trim().replace(/^\/+|\/+$/g, "");
        const parent = parentOf(path);
        const nextPath = parent ? `${parent}/${trimmed}` : trimmed;
        if (!trimmed || nextPath === path) {
          setEdit(null);
          return;
        }
        if (kind === "folder") renameFolder(path, nextPath);
        else renameFile(path, nextPath);
        setEdit(null);
      },
      cancel: () => setEdit(null),
    }),
    [edit, createFile, createFolder, renameFile, renameFolder],
  );

  const creating = edit?.mode === "create" ? edit : null;

  return (
    <ExplorerContext.Provider value={ctx}>
      <div className="flex h-full flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Explorer
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => ctx.startCreate("", "file")}
              className="rounded-md p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="New file"
              title="New file"
            >
              <FilePlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => ctx.startCreate("", "folder")}
              className="rounded-md p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="New folder"
              title="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-8 w-full rounded-md border border-input bg-background/50 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-1.5 pb-3">
          {/* Root-level inline creation row. */}
          {creating && creating.parent === "" && (
            <NameInput depth={0} kind={creating.kind} />
          )}

          {filtered.length === 0 && !creating ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {query
                ? "No matching files"
                : "No files yet — generate or add one to begin."}
            </p>
          ) : (
            visibleNodes(filtered).map((node) => (
              <TreeNode key={node.path} node={node} depth={0} />
            ))
          )}
        </div>
      </div>
    </ExplorerContext.Provider>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const { edit, startCreate, startRename } = useExplorer();
  const [open, setOpen] = React.useState(depth < 2);
  const activeFilePath = useWorkspace((s) => s.activeFilePath);
  const setActiveFile = useWorkspace((s) => s.setActiveFile);
  const deleteFile = useWorkspace((s) => s.deleteFile);
  const deleteFolder = useWorkspace((s) => s.deleteFolder);

  const creating = edit?.mode === "create" ? edit : null;
  const creatingHere = creating?.parent === node.path;
  React.useEffect(() => {
    if (creatingHere) setOpen(true);
  }, [creatingHere]);

  const isRenaming = edit?.mode === "rename" && edit.path === node.path;
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === "directory") {
    const children = visibleNodes(node.children ?? []);
    return (
      <div>
        {isRenaming ? (
          <NameInput
            depth={depth}
            kind="folder"
            path={node.path}
            current={node.name}
            withChevron
          />
        ) : (
          <div className="group flex items-center rounded-md pr-1.5 text-sm text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5"
              style={pad}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  open && "rotate-90",
                )}
              />
              {open ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-primary/70" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreate(node.path, "file");
                }}
                className="rounded p-0.5 hover:text-foreground"
                aria-label={`New file in ${node.name}`}
                title="New file"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreate(node.path, "folder");
                }}
                className="rounded p-0.5 hover:text-foreground"
                aria-label={`New folder in ${node.name}`}
                title="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(node.path);
                }}
                className="rounded p-0.5 hover:text-foreground"
                aria-label={`Rename ${node.name}`}
                title="Rename folder"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(node.path);
                }}
                className="rounded p-0.5 hover:text-red-400"
                aria-label={`Delete ${node.name}`}
                title="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {open && (
          <>
            {creatingHere && (
              <NameInput depth={depth + 1} kind={creating.kind} />
            )}
            {children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </>
        )}
      </div>
    );
  }

  const active = activeFilePath === node.path;
  if (isRenaming) {
    return (
      <NameInput
        depth={depth}
        kind="file"
        path={node.path}
        current={node.name}
      />
    );
  }
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
      style={pad}
    >
      <button
        onClick={() => setActiveFile(node.path)}
        className="flex min-w-0 flex-1 items-center gap-1.5"
      >
        <FileIcon className="ml-[18px] h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => startRename(node.path)}
          className="hover:text-foreground"
          aria-label={`Rename ${node.name}`}
          title="Rename file"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => deleteFile(node.path)}
          className="hover:text-red-400"
          aria-label={`Delete ${node.name}`}
          title="Delete file"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Shared inline input for both creating and renaming entries. */
function NameInput({
  depth,
  kind,
  path,
  current,
  withChevron,
}: {
  depth: number;
  kind: CreateKind;
  path?: string;
  current?: string;
  withChevron?: boolean;
}) {
  const { submitCreate, submitRename, cancel } = useExplorer();
  const [value, setValue] = React.useState(current ?? "");
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (!current) return;
    const dot = current.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : current.length);
  }, [current]);

  const save = () => {
    if (path) submitRename(path, kind, value);
    else submitCreate(value);
  };
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  return (
    <div className="flex items-center gap-1.5 py-1" style={pad}>
      {withChevron && <span className="w-3.5 shrink-0" />}
      {kind === "folder" ? (
        <Folder className="h-4 w-4 shrink-0 text-primary/70" />
      ) : (
        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") cancel();
        }}
        onBlur={() => (value.trim() ? save() : cancel())}
        placeholder={kind === "folder" ? "folder name" : "file name"}
        className="h-6 w-full rounded border border-input bg-background/70 px-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

/** The directory path containing `path` ("" for project root). */
function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Drop the internal folder placeholder from rendered children. */
function visibleNodes(nodes: FileNode[]): FileNode[] {
  return nodes.filter((n) => n.name !== FOLDER_KEEP);
}

/** Recursively keep files whose path matches the query, plus their parents. */
function filterTree(nodes: FileNode[], query: string): FileNode[] {
  const out: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      if (node.path.toLowerCase().includes(query)) out.push(node);
    } else {
      const children = filterTree(node.children ?? [], query);
      if (children.length > 0 || node.name.toLowerCase().includes(query)) {
        out.push({ ...node, children });
      }
    }
  }
  return out;
}
