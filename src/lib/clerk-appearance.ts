import { dark } from "@clerk/themes";

/**
 * Clerk appearance tuned to WebFlowAI's design tokens (see globals.css):
 * indigo-blue accent on a near-neutral dark surface, tight radius, Inter.
 * Shared by ClerkProvider (sign-in/up) and the embedded <UserProfile/>.
 */
export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#5c7edb", // hsl(224 64% 61%) — app --primary
    colorBackground: "#141519", // ~ hsl(240 6% 9%) — app --card
    colorText: "#f5f5f6", // ~ hsl(0 0% 96%) — app --foreground
    colorTextSecondary: "#a0a0ab", // ~ --muted-foreground
    colorInputBackground: "#1b1c22", // ~ --input
    colorInputText: "#f5f5f6",
    colorNeutral: "#f5f5f6",
    colorDanger: "#f87171",
    colorSuccess: "#4ade80",
    colorWarning: "#fbbf24",
    borderRadius: "0.625rem", // app --radius
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    card: "bg-card/60 border border-border shadow-2xl",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border bg-white/[0.02] hover:bg-white/[0.05] text-foreground",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm normal-case",
    footerActionLink: "text-primary hover:text-primary/90",
    badge: "bg-primary/15 text-primary",
  },
};
