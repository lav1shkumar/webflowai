"use client";

import * as React from "react";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/store";
import { webContainerService } from "@/features/webcontainer/service";
import { Button } from "@/components/ui/button";
import type { ServerStatus } from "@/features/webcontainer/service";

const statusCopy: Record<ServerStatus, string> = {
  idle: "Not started",
  booting: "Booting runtime…",
  mounting: "Mounting files…",
  installing: "Installing dependencies…",
  starting: "Starting dev server…",
  ready: "Live",
  error: "Error",
};

export function PreviewPanel() {
  const serverStatus = useWorkspace((s) => s.serverStatus);
  const previewUrl = useWorkspace((s) => s.previewUrl);
  const bootPreview = useWorkspace((s) => s.bootPreview);
  const restartPreview = useWorkspace((s) => s.restartPreview);
  const [iframeKey, setIframeKey] = React.useState(0);

  const supported = webContainerService.isSupported;
  const busy =
    serverStatus !== "idle" &&
    serverStatus !== "ready" &&
    serverStatus !== "error";

  return (
    <div className="flex h-full flex-col bg-card/10">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="flex items-center gap-1.5">
          <span
            className={
              serverStatus === "ready"
                ? "h-2 w-2 rounded-full bg-emerald-400"
                : serverStatus === "error"
                  ? "h-2 w-2 rounded-full bg-red-400"
                  : "h-2 w-2 rounded-full bg-amber-400"
            }
          />
          <span className="text-xs text-muted-foreground">
            {statusCopy[serverStatus]}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIframeKey((k) => k + 1)}
            disabled={!previewUrl}
            aria-label="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void restartPreview()}
            disabled={serverStatus === "idle"}
            aria-label="Restart server"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (previewUrl) {
                window.open(previewUrl, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!previewUrl}
            aria-label="Open preview in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="h-full w-full bg-white"
            title="Live preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            {!supported ? (
              <Unsupported />
            ) : serverStatus === "error" ? (
              <ErrorState onRetry={() => void bootPreview()} />
            ) : busy ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">{statusCopy[serverStatus]}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="max-w-xs text-sm text-muted-foreground">
                  Boot the in-browser runtime to see your app live.
                </p>
                <Button variant="brand" onClick={() => void bootPreview()}>
                  <Play className="h-4 w-4" /> Run preview
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Unsupported() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
      <AlertTriangle className="h-6 w-6 text-amber-400" />
      <p className="text-sm font-medium text-foreground">
        Preview needs cross-origin isolation
      </p>
      <p className="text-xs">
        Live preview uses WebContainers, which require a cross-origin-isolated
        browser context (Chrome/Edge desktop). The rest of the workspace works
        everywhere.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <AlertTriangle className="h-6 w-6 text-red-400" />
      <p className="text-sm">The dev server hit an error. Check the terminal.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
