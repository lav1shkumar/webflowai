"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameProject, deleteProject } from "@/server/projects";

/**
 * Per-project actions (rename / delete). Rendered as an overlay on the project
 * card, above its stretched navigation link so clicks don't trigger
 * navigation. Server actions revalidate the dashboard/projects routes; we also
 * `router.refresh()` to reflect changes immediately.
 */
export function ProjectCardMenu({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState(projectName);
  const [pending, setPending] = React.useState(false);

  const submitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === projectName) {
      setRenameOpen(false);
      return;
    }
    setPending(true);
    try {
      const res = await renameProject(projectId, trimmed);
      if (res.ok) {
        toast.success("Project renamed");
        setRenameOpen(false);
        router.refresh();
      } else {
        toast.error(errorCopy(res.error));
      }
    } finally {
      setPending(false);
    }
  };

  const submitDelete = async () => {
    setPending(true);
    try {
      const res = await deleteProject(projectId);
      if (res.ok) {
        toast.success("Project deleted");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(errorCopy(res.error));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => {
            setName(projectName);
            setRenameOpen(true);
          }}
          aria-label="Rename project"
          title="Rename"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete project"
          title="Delete"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Give this project a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => void submitRename()}
              disabled={pending || !name.trim()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">{projectName}</span>{" "}
              and all of its files and chat history. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitDelete()}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function errorCopy(error?: string): string {
  switch (error) {
    case "not-authenticated":
      return "Sign in to manage projects.";
    case "not-found":
      return "Project not found.";
    case "empty-name":
      return "Name can't be empty.";
    default:
      return "Something went wrong.";
  }
}
