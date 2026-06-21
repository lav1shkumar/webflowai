import {
  BarChart3,
  LayoutTemplate,
  Rocket,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Maps the string icon names used in data files to lucide components. */
export const iconRegistry: Record<string, LucideIcon> = {
  Rocket,
  Sparkles,
  Users,
  BarChart3,
  ShoppingBag,
  LayoutTemplate,
  Wrench,
};

export function resolveIcon(name: string): LucideIcon {
  return iconRegistry[name] ?? Sparkles;
}
