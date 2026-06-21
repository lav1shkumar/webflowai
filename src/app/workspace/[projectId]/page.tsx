"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useWorkspace } from "@/features/workspace/store";

/**
 * Cross-origin isolation (required for WebContainers / SharedArrayBuffer) is a
 * property of the *loaded document*. The COOP/COEP headers are scoped to
 * `/workspace/*` (see next.config.ts), so a client-side navigation from the
 * dashboard arrives on a document that was served without them — leaving the
 * preview unsupported until a manual refresh. We detect that case and perform
 * one full reload of the workspace URL so the headers apply. A sessionStorage
 * flag prevents an infinite loop on browsers where isolation is truly
 * unavailable.
 */
const COI_RELOAD_KEY = "wfa:coi-reload";

function WorkspaceBootstrap() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const init = useWorkspace((s) => s.init);
  const projectId = params.projectId;
  const prompt = searchParams.get("prompt") ?? undefined;
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.crossOriginIsolated) {
      // Arrived via SPA navigation (no COOP/COEP). Reload once to get a
      // document served with the isolation headers.
      if (!sessionStorage.getItem(COI_RELOAD_KEY)) {
        sessionStorage.setItem(COI_RELOAD_KEY, "1");
        window.location.reload();
        return;
      }
      // Already reloaded and still not isolated → the browser/context genuinely
      // doesn't support it. Proceed and let the preview show its fallback.
    }
    sessionStorage.removeItem(COI_RELOAD_KEY);
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    init(projectId, prompt);
    // Re-run when the project id or the (possibly late-resolving) prompt
    // search param changes. `init` is idempotent and seeds the prompt at
    // most once per project.
  }, [ready, projectId, prompt, init]);

  if (!ready) return <WorkspaceFallback />;
  return <WorkspaceShell projectId={projectId} />;
}

export default function WorkspacePage() {
  return (
    <React.Suspense fallback={<WorkspaceFallback />}>
      <WorkspaceBootstrap />
    </React.Suspense>
  );
}

function WorkspaceFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
