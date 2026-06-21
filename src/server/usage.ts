import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { demoUsage, type UsagePoint } from "@/lib/mock-data";

export interface GenerationUsage {
  /** Total generations in the current calendar month. */
  thisMonth: number;
  /** Daily generation counts for the last 7 days (oldest → newest). */
  series: UsagePoint[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Real "generations this month" + a 7-day daily series, derived from
 * {@link prisma} `UsageEvent` rows of type GENERATION. Falls back to demo data
 * for anonymous/demo sessions so the dashboard chart stays populated.
 */
export async function getGenerationUsage(): Promise<GenerationUsage> {
  const user = await getCurrentDbUser();
  if (!user) {
    return {
      thisMonth: demoUsage.generationsThisMonth,
      series: demoUsage.series,
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowStart = startOfDay(now);
  windowStart.setDate(windowStart.getDate() - 6); // last 7 days incl. today

  const [thisMonth, events] = await Promise.all([
    prisma.usageEvent.count({
      where: {
        userId: user.id,
        type: "GENERATION",
        createdAt: { gte: monthStart },
      },
    }),
    prisma.usageEvent.findMany({
      where: {
        userId: user.id,
        type: "GENERATION",
        createdAt: { gte: windowStart },
      },
      select: { createdAt: true },
    }),
  ]);

  // Bucket events into one bar per day across the 7-day window.
  const series: UsagePoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(windowStart);
    dayStart.setDate(windowStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const value = events.filter(
      (e) => e.createdAt >= dayStart && e.createdAt < dayEnd,
    ).length;
    series.push({ label: WEEKDAYS[dayStart.getDay()] ?? "", value });
  }

  return { thisMonth, series };
}
