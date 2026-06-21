"use client";

import { UserProfile } from "@clerk/nextjs";

/**
 * Clerk's first-party account management UI (profile, email, password, 2FA,
 * active sessions, account deletion). Colors/typography come from the global
 * ClerkProvider appearance; here we only adjust layout so it fills the panel.
 */
export function ClerkUserProfile() {
  return (
    <UserProfile
      routing="hash"
      appearance={{
        elements: {
          rootBox: "w-full",
          cardBox:
            "w-full max-w-none shadow-none border border-border rounded-2xl",
          navbar: "bg-transparent",
          pageScrollBox: "bg-transparent",
          scrollBox: "bg-transparent",
        },
      }}
    />
  );
}
