import "server-only";

export interface UsagePoint {
  label: string;
  value: number;
}

export interface GenerationUsage {
  thisMonth: number;
  series: UsagePoint[];
}

/**
 * Returns usage data for the dashboard chart.
 * TODO: Replace with real metering queries when usage tracking is implemented.
 */
export async function getGenerationUsage(): Promise<GenerationUsage> {
  return {
    thisMonth: 0,
    series: [
      { label: "Mon", value: 0 },
      { label: "Tue", value: 0 },
      { label: "Wed", value: 0 },
      { label: "Thu", value: 0 },
      { label: "Fri", value: 0 },
      { label: "Sat", value: 0 },
      { label: "Sun", value: 0 },
    ],
  };
}
