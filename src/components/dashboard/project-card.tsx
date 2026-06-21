import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/site";
import { timeAgo } from "@/lib/utils";
import { ProjectCardMenu } from "@/components/dashboard/project-card-menu";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string;
  status: string;
  framework: string;
  updatedAt: string;
  gradient: string;
}

const statusVariant: Record<
  string,
  "success" | "warning" | "secondary" | "destructive"
> = {
  READY: "success",
  GENERATING: "warning",
  DRAFT: "secondary",
  ERROR: "destructive",
  ARCHIVED: "secondary",
};

const statusLabel: Record<string, string> = {
  READY: "Ready",
  GENERATING: "Generating",
  DRAFT: "Draft",
  ERROR: "Error",
  ARCHIVED: "Archived",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant[status]}>
      {status === "GENERATING" && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {statusLabel[status] ?? status}
    </Badge>
  );
}

export function ProjectCard({
  project,
  variant = "default",
}: {
  project: ProjectCardData;
  variant?: "default" | "compact";
}) {
  // Compact variant (Projects tab): no gradient thumbnail — status moves
  // inline with the metadata footer.
  if (variant === "compact") {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 card-hover">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold leading-tight">
              {project.name}
            </h3>
            <div className="relative z-10 -mr-1 -mt-1">
              <ProjectCardMenu
                projectId={project.id}
                projectName={project.name}
              />
            </div>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="truncate rounded-md bg-foreground/[0.04] px-2 py-0.5 capitalize">
                {project.framework}
              </span>
            </div>
            <span className="shrink-0">{timeAgo(project.updatedAt)}</span>
          </div>
        </div>

        <a
          href={routes.workspace(project.id)}
          aria-label={`Open ${project.name}`}
          className="absolute inset-0 z-0"
        />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 card-hover">
      <div className={`relative h-28 bg-gradient-to-br ${project.gradient}`}>
        <div className="absolute inset-0 bg-grid-pattern bg-[size:20px_20px] opacity-20" />
        <div className="absolute right-3 top-3 z-10">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{project.name}</h3>
          {/* Menu sits above the stretched link so it stays clickable. */}
          <div className="relative z-10 -mr-1 -mt-1">
            <ProjectCardMenu
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded-md bg-foreground/[0.04] px-2 py-0.5 capitalize">
            {project.framework}
          </span>
          <span>{timeAgo(project.updatedAt)}</span>
        </div>
      </div>

      {/* Stretched navigation link covering the whole card (under the menu). */}
      <a
        href={routes.workspace(project.id)}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0 z-0"
      />
    </div>
  );
}
