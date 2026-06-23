import { dark } from "@clerk/themes";

/**
 * Clerk appearance tuned to WebFlowAI's design tokens (see globals.css).
 *
 * We provide TWO appearance objects — one for dark, one for light — and pick
 * the right one at render time based on the resolved theme. The `elements`
 * use Tailwind utility classes which adapt automatically via CSS variables.
 */

const sharedElements = {
  card: "bg-card border border-border shadow-lg rounded-2xl",
  headerTitle: "text-foreground",
  headerSubtitle: "text-muted-foreground",
  socialButtonsBlockButton:
    "border border-border bg-transparent hover:bg-accent text-foreground",
  formButtonPrimary:
    "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm normal-case",
  footerActionLink: "text-primary hover:text-primary/90",
  badge: "bg-primary/15 text-primary",
  navbarButton: "text-foreground hover:bg-accent",
  profileSectionContent: "text-foreground",
  formFieldInput: "bg-background border-input text-foreground",
  formFieldLabel: "text-foreground",
};

/** Dark mode Clerk config. */
export const clerkAppearanceDark = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#fbe2a7",
    colorBackground: "#141210",
    colorText: "#e8e3da",
    colorTextSecondary: "#8a8070",
    colorInputBackground: "#1e1b17",
    colorInputText: "#e8e3da",
    colorNeutral: "#e8e3da",
    colorDanger: "#f87171",
    colorSuccess: "#4ade80",
    colorWarning: "#fbbf24",
    borderRadius: "0.625rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: sharedElements,
};

/** Light mode Clerk config. */
export const clerkAppearanceLight = {
  variables: {
    colorPrimary: "#644a40", // rgb(100, 74, 64) — warm coffee brown for light mode
    colorBackground: "#ffffff",
    colorText: "#1c1610",
    colorTextSecondary: "#5c5347",
    colorInputBackground: "#faf9f7",
    colorInputText: "#1c1610",
    colorNeutral: "#1c1610",
    colorDanger: "#dc2626",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    borderRadius: "0.625rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: sharedElements,
};

/**
 * Legacy export — defaults to dark. Use `clerkAppearanceDark` or
 * `clerkAppearanceLight` directly for theme-aware rendering.
 */
export const clerkAppearance = clerkAppearanceDark;
