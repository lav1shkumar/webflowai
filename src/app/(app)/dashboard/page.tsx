import Link from "next/link";
import {
  ArrowRight,
  Coins,
  FolderKanban,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { resolveIcon } from "@/components/shared/icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listProjects } from "@/server/projects";
import { getViewer, type Viewer } from "@/server/viewer";
import { getGenerationUsage } from "@/server/usage";
import { templates } from "@/features/templates/data";
import { getPlan } from "@/features/billing/plans";
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
        <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
          {/* Greeting + composer */}
          <section className="relative space-y-5">
            <AmbientAurora />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome back, {viewer.name.split(" ")[0]}
              </h2>
              <p className="mt-1 text-muted-foreground">
                Describe an idea and WebFlowAI will build it for you.
              </p>
            </div>
            <PromptComposer />
          </section>

          {/* Stat cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card/40">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Credits
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <CreditRing value={creditPct} />
                  <div className="min-w-0">
                    <div className="text-2xl font-bold">
                      <CountUp value={viewer.creditsBalance} />
                      <span className="text-base font-normal text-muted-foreground">
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

            <Card className="bg-card/40">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projects
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderKanban className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <CountUp value={projectCount} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
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

            <Card className="bg-card/40 sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Generations this month
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <CountUp value={usage.thisMonth} />
                </div>
                <div className="mt-2">
                  <UsageChart data={usage.series} />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Recent projects */}
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
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Templates */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Start from a template</h3>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.templates}>
                  Browse all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {templates.slice(0, 4).map((template) => {
                const Icon = resolveIcon(template.icon);
                return (
                  <Link
                    key={template.id}
                    href={routes.templates}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card/40 p-4 card-hover"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${template.gradient}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {template.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {template.category}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Plan-aware upsell */}
          <PlanUpsell plan={viewer.plan} />
        </div>
      </ScrollArea>
    </>
  );
}

/**
 * Subtle, performant ambient glow behind the composer. CSS-only (uses the
 * `aurora` keyframe from the Tailwind config), so it stays a server component.
 */
function AmbientAurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-6 -top-10 bottom-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/4 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px] animate-aurora" />
      <div className="absolute right-1/4 top-4 h-48 w-48 translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[80px] animate-aurora [animation-delay:-6s]" />
      <div className="absolute left-1/2 top-8 h-40 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[90px] animate-aurora [animation-delay:-11s]" />
    </div>
  );
}

/**
 * Plan-aware call-to-action. Shows the next-tier upsell (with figures pulled
 * live from the plan catalog) for Free/Pro, and a "manage" card for Team — so
 * it never tells a Pro user to "unlock Pro".
 */
function PlanUpsell({ plan }: { plan: Viewer["plan"] }) {
  const pro = getPlan("pro");
  const team = getPlan("team");
  const fmt = (n: number) => n.toLocaleString("en-US");

  let badge: string | null = null;
  let title: string;
  let desc: string;
  let cta: string;

  if (plan === "FREE") {
    title = "Unlock more with Pro";
    desc = pro
      ? `${fmt(pro.credits)} credits/month, unlimited projects, and priority generation.`
      : "More credits, unlimited projects, and priority generation.";
    cta = "Upgrade to Pro";
  } else if (plan === "PRO") {
    badge = "You're on Pro";
    title = "Scale up with Team";
    desc = team
      ? `${fmt(team.credits)} credits/month, shared workspaces & roles, and SSO.`
      : "Shared workspaces, roles, and SSO for your whole team.";
    cta = "Explore Team";
  } else {
    badge = "You're on Team";
    title = "You've got the full toolkit";
    desc = "Manage seats, billing, and SSO anytime from settings.";
    cta = "Manage plan";
  }

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-[10px]">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        <Button asChild variant={plan === "TEAM" ? "outline" : "brand"}>
          <Link href={routes.billing}>{cta}</Link>
        </Button>
      </div>
    </section>
  );
}
