import Link from "next/link";
import { Plus } from "lucide-react";
import { AppTopbar } from "@/components/app/topbar";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listProjects } from "@/server/projects";
import { routes } from "@/config/site";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <>
      <AppTopbar title="Projects" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </p>
            <Button asChild variant="brand" size="sm">
              <Link href={routes.dashboard}>
                <Plus className="h-4 w-4" /> New Project
              </Link>
            </Button>
          </div>

          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Plus className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 font-semibold">No projects yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Describe an idea on the dashboard and WebFlowAI will build your first
        app in minutes.
      </p>
      <Button asChild variant="brand" className="mt-5">
        <Link href={routes.dashboard}>Start building</Link>
      </Button>
    </div>
  );
}
