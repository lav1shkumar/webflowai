import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";

export interface UsagePoint {
  label: string;
  value: number;
}

export interface GenerationUsage {
  thisMonth: number;
  series: UsagePoint[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Returns generation usage for the dashboard, derived from ASSISTANT messages
 * (each AI generation produces one) across the current user's projects.
 */
export async function getGenerationUsage(): Promise<GenerationUsage> {
  const emptySeries: UsagePoint[] = [];
  const today = startOfDay(new Date());
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    emptySeries.push({ label: DAY_LABELS[day.getDay()]!, value: 0 });
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return { thisMonth: 0, series: emptySeries };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  // Count generations this month across all of the user's projects.
  const thisMonth = await prisma.message.count({
    where: {
      role: "ASSISTANT",
      createdAt: { gte: monthStart },
      project: { ownerId: user.id },
    },
  });

  // Pull the last 7 days of generations and bucket them by day for the chart.
  const recent = await prisma.message.findMany({
    where: {
      role: "ASSISTANT",
      createdAt: { gte: weekStart },
      project: { ownerId: user.id },
    },
    select: { createdAt: true },
  });

  const series = emptySeries.map((point) => ({ ...point }));
  for (const msg of recent) {
    const day = startOfDay(msg.createdAt);
    const index = Math.round(
      (day.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (index >= 0 && index < series.length) {
      series[index]!.value += 1;
    }
  }

  return { thisMonth, series };
}
