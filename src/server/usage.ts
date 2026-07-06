import "server-only";
import { demoUsage, type UsagePoint } from "@/lib/mock-data";

export interface GenerationUsage {
  thisMonth: number;
  series: UsagePoint[];
}

/**
 * Returns demo usage data for the dashboard chart.
 * Real metering can be re-added later if needed.
 */
export async function getGenerationUsage(): Promise<GenerationUsage> {
  return {
    thisMonth: demoUsage.generationsThisMonth,
    series: demoUsage.series,
  };
}
