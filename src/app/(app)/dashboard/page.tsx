import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Eye,
  FolderKanban,
  LayoutTemplate,
  Plus,
  TrendingUp,
} from "lucide-react";
import { AppTopbar } from "@/components/app/topbar";
import { PromptComposer } from "@/components/dashboard/prompt-composer";
import { ProjectCard } from "@/components/dashboard/project-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { CountUp } from "@/components/dashboard/count-up";
import { CreditRing } from "@/components/dashboard/credit-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listProjects } from "@/server/projects";
import { getViewer } from "@/server/viewer";
import { getGenerationUsage } from "@/server/usage";
import { routes } from "@/config/site";

export default async function DashboardPage() {
  const [projects, viewer, usage] = await Promise.all([
    listProjects(),
    getViewer(),
    getGenerationUsage(),
  ]);
  const projectCount = projects.length;
  const creditPct = Math.round(
    (viewer.creditsBalance / Math.max(1, viewer.creditsMonthly)) * 100,
  );

  return (
    <>
      <AppTopbar title="Dashboard" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
          {/* Quick Actions */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <QuickActionCard
                href={routes.dashboard + "?new=1"}
                icon={<Plus className="h-5 w-5" />}
                label="Start New Project"
              />
              <QuickActionCard
                href={routes.templates}
                icon={<LayoutTemplate className="h-5 w-5" />}
                label="Browse Templates"
              />
              <QuickActionCard
                href={routes.billing}
                icon={<Coins className="h-5 w-5" />}
                label="View AI Credits"
              />
              <QuickActionCard
                href={routes.projects}
                icon={<Eye className="h-5 w-5" />}
                label="Manage Workspaces"
              />
            </div>
          </section>

          {/* Prompt Composer */}
          <section>
            <PromptComposer />
          </section>

          {/* Stats Row */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* AI Credits */}
            <Card className="bg-card/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Credits
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <CreditRing value={creditPct} />
                  <div className="min-w-0">
                    <div className="text-2xl font-bold">
                      <CountUp value={viewer.creditsBalance} />
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {viewer.creditsMonthly}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      credits left · resets in 12 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects */}
            <Card className="bg-card/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projects
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp value={projectCount} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across all workspaces
                </p>
                <Button
                  asChild
                  variant="link"
                  className="mt-1 h-auto p-0 text-xs"
                >
                  <Link href={routes.projects}>
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Generations this month */}
            <Card className="bg-card/60 sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Generations this month
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp value={usage.thisMonth} />
                </div>
                <div className="mt-3">
                  <UsageChart data={usage.series} />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Recent Projects */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent projects</h3>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.projects}>
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No projects yet — describe an idea above to create your first
                  one.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.slice(0, 3).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="default"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </>
  );
}

/**
 * Quick action card — minimal, icon top-left, label bottom-left.
 * Matches the reference design's rounded bordered cards.
 */
function QuickActionCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-28 flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-primary/30 hover:bg-card/80"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-foreground/[0.04] text-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
