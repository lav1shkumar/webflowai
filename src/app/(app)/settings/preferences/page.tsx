"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "webflowai:preferences";

const preferences = [
  {
    key: "email-product",
    label: "Product updates",
    description: "News about features and improvements.",
    default: true,
  },
  {
    key: "email-usage",
    label: "Usage alerts",
    description: "Notify me when I'm close to my credit limit.",
    default: true,
  },
  {
    key: "autorun",
    label: "Auto-run preview",
    description: "Boot the preview automatically after generation.",
    default: false,
  },
  {
    key: "stream",
    label: "Stream agent reasoning",
    description: "Show token-by-token output in the chat.",
    default: true,
  },
];

export default function PreferencesPage() {
  const defaults = React.useMemo(
    () => Object.fromEntries(preferences.map((p) => [p.key, p.default])),
    [],
  );
  const [state, setState] = React.useState<Record<string, boolean>>(defaults);

  // Load persisted preferences on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* ignore malformed storage */
    }
  }, [defaults]);

  const toggle = (key: string, value: boolean) => {
    setState((s) => {
      const next = { ...s, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    toast.success("Preference saved");
  };

  return (
    <Card className="bg-card/40">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {preferences.map((pref) => (
          <div
            key={pref.key}
            className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
          >
            <div className="pr-6">
              <Label htmlFor={pref.key} className="text-sm font-medium">
                {pref.label}
              </Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {pref.description}
              </p>
            </div>
            <Switch
              id={pref.key}
              checked={state[pref.key]}
              onCheckedChange={(v) => toggle(pref.key, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
