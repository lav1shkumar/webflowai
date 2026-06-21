"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const onClick = () => {
    const confirmed = window.confirm(
      "Delete your account? This permanently removes your projects and data and cannot be undone.",
    );
    if (!confirmed) return;
    // Account deletion is gated until the data-retention flow is finalized.
    toast("Account deletion isn't enabled yet — contact support@webflowai.dev.");
  };

  return (
    <Button variant="destructive" size="sm" onClick={onClick}>
      Delete account
    </Button>
  );
}
