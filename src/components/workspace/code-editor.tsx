"use client";

import * as React from "react";
import { FileCode, X } from "lucide-react";
import { useWorkspace } from "@/features/workspace/store";
import { languageFromPath } from "@/features/webcontainer/files";
import { cn } from "@/lib/utils";

/**
 * A lightweight, dependency-free code editor: a synced line-number gutter
 * plus a monospace textarea. Good enough for in-workspace edits without
 * pulling in a heavy editor bundle; swappable for Monaco/CodeMirror later.
 */
export function CodeEditor() {
  const activeFilePath = useWorkspace((s) => s.activeFilePath);
  const files = useWorkspace((s) => s.files);
  const writeFile = useWorkspace((s) => s.writeFile);
  const setActiveFile = useWorkspace((s) => s.setActiveFile);
  const deleteFile = useWorkspace((s) => s.deleteFile);

  const openPaths = React.useMemo(() => {
    return activeFilePath ? [activeFilePath] : [];
  }, [activeFilePath]);

  if (!activeFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <FileCode className="h-10 w-10 opacity-30" />
        <p className="mt-3 text-sm">Select a file to view its contents</p>
      </div>
    );
  }

  const content = files[activeFilePath] ?? "";
  const lines = content.split("\n");
  const language = languageFromPath(activeFilePath);

  return (
    <div className="flex h-full flex-col bg-background/40">
      {/* Tabs */}
      <div className="flex h-10 shrink-0 items-center border-b border-border bg-card/20">
        {openPaths.map((path) => (
          <div
            key={path}
            className={cn(
              "flex h-full items-center gap-2 border-r border-border px-3 text-xs",
              path === activeFilePath
                ? "bg-background/60 text-foreground"
                : "text-muted-foreground",
            )}
          >
            <FileCode className="h-3.5 w-3.5 text-primary/70" />
            <span>{path.split("/").pop()}</span>
            <button
              onClick={() => {
                deleteFile(path);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close tab"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <span className="ml-auto px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
      </div>

      {/* Editor body */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="select-none overflow-hidden bg-card/20 px-3 py-3 text-right font-mono text-xs leading-6 text-muted-foreground/50">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => writeFile(activeFilePath, e.target.value)}
          spellCheck={false}
          className="no-scrollbar flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-6 text-foreground/90 outline-none"
          style={{ tabSize: 2 }}
          onFocus={() => setActiveFile(activeFilePath)}
        />
      </div>
    </div>
  );
}
