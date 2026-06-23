"use client";

import * as React from "react";
import Link from "next/link";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Code2, Eye, Play, Download, ChevronLeft } from "lucide-react";
import { useWorkspace } from "@/features/workspace/store";
import { WorkspaceRail } from "@/components/workspace/rail";
import { FileExplorer } from "@/components/workspace/file-explorer";
import { ChatPanel } from "@/components/workspace/chat-panel";
import { CodeEditor } from "@/components/workspace/code-editor";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { TerminalPanel } from "@/components/workspace/terminal-panel";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { routes } from "@/config/site";
import { cn } from "@/lib/utils";
import { zipFiles } from "@/lib/zip";

function ResizeHandle({ vertical }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative bg-border transition-colors data-[resize-handle-state=hover]:bg-primary/40 data-[resize-handle-state=drag]:bg-primary",
        vertical ? "h-px w-full" : "w-px",
      )}
    >
      <div
        className={cn(
          "absolute z-10",
          vertical
            ? "inset-x-0 -top-1 h-2"
            : "inset-y-0 -left-1 w-2",
        )}
      />
    </PanelResizeHandle>
  );
}

export function WorkspaceShell({ projectId }: { projectId: string }) {
  const [showFiles, setShowFiles] = React.useState(true);
  const [view, setView] = React.useState<"editor" | "preview">("editor");
  const bootPreview = useWorkspace((s) => s.bootPreview);
  const serverStatus = useWorkspace((s) => s.serverStatus);
  const files = useWorkspace((s) => s.files);

  const fileCount = Object.keys(files).length;

  const handleDownload = React.useCallback(() => {
    if (Object.keys(files).length === 0) return;
    const blob = zipFiles(files);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectId || "webflowai-project"}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [files, projectId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WorkspaceRail
        activePanel={showFiles}
        onToggleFiles={() => setShowFiles((v) => !v)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/30 px-4">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={routes.dashboard} aria-label="Back to dashboard">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium">Untitled project</span>
          <span className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
            {projectId.slice(0, 12)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <button
                onClick={() => setView("editor")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  view === "editor"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Code2 className="h-3.5 w-3.5" /> Editor
              </button>
              <button
                onClick={() => setView("preview")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  view === "preview"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
            <Button
              variant="brand"
              size="sm"
              className="border border-primary/50"
              onClick={() => {
                setView("preview");
                void bootPreview();
              }}
              disabled={serverStatus !== "idle" && serverStatus !== "error"}
            >
              <Play className="h-3.5 w-3.5" /> Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={fileCount === 0}
              title="Download all files as a .zip"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </header>

        {/* Panels */}
        <PanelGroup direction="horizontal" className="flex-1">
          {showFiles && (
            <>
              <Panel defaultSize={16} minSize={12} maxSize={28} className="bg-card/20">
                <FileExplorer />
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel defaultSize={30} minSize={22}>
            <ChatPanel />
          </Panel>
          <ResizeHandle />

          <Panel defaultSize={54} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full" hidden={view !== "editor"}>
                  <CodeEditor />
                </div>
                <div className="h-full" hidden={view !== "preview"}>
                  <PreviewPanel />
                </div>
              </Panel>
              <ResizeHandle vertical />
              <Panel defaultSize={30} minSize={12}>
                <TerminalPanel />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
