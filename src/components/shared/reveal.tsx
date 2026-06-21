"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * Reveal — a small wrapper that fades + lifts its children into view on
 * scroll. Used across marketing sections for a cohesive motion language.
 */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
