"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Sign-out menu item backed by Clerk. Only render this when Clerk is
 * configured — `useClerk` requires a ClerkProvider in the tree.
 */
export function ClerkSignOutItem() {
  const { signOut } = useClerk();
  return (
    <DropdownMenuItem onSelect={() => void signOut({ redirectUrl: "/" })}>
      <LogOut /> Sign out
    </DropdownMenuItem>
  );
}
