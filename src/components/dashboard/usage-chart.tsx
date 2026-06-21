"use client";

import { motion } from "framer-motion";
import type { UsagePoint } from "@/lib/mock-data";

export function UsageChart({ data }: { data: UsagePoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end justify-between gap-2">
      {data.map((point, i) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end justify-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(point.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              className="w-full max-w-[28px] rounded-md bg-brand-gradient"
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}
