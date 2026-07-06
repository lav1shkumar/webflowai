"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useWorkspace } from "@/features/workspace/store";

// Suspense is required because useSearchParams() needs it in Next.js App Router.

function Workspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const prompt = useSearchParams().get("prompt") ?? undefined;
  const init = useWorkspace((s) => s.init);

  useEffect(() => {
    init(projectId, prompt);
  }, [projectId, prompt, init]);

  return <WorkspaceShell projectId={projectId} />;
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
