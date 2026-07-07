import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require an authenticated session.
 */
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/projects(.*)",
  "/templates(.*)",
  "/settings(.*)",
  "/workspace(.*)",
  "/onboarding(.*)",
]);

/**
 * Public entry routes that a signed-in user shouldn't sit on — send them
 * straight to the dashboard.
 */
const isAuthFlowRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
);

/**
 * When Clerk is configured we enforce auth on protected routes. Otherwise the
 * app runs in a public demo mode (middleware is a passthrough) so the product
 * is fully explorable without credentials.
 */
const middleware = hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { userId, redirectToSignIn } = await auth();

      // Signed-out users hitting a protected route → sign-in (Clerk v6's
      // auth.protect() otherwise returns a 404).
      if (isProtectedRoute(req) && !userId) {
        return redirectToSignIn({ returnBackUrl: req.url });
      }

      // Signed-in users on auth pages → dashboard.
      if (isAuthFlowRoute(req) && userId && !req.nextUrl.pathname.startsWith("/sign")) {
        // Only redirect from "/" — not from sign-in/sign-up to avoid loops.
        if (req.nextUrl.pathname === "/") {
          const url = req.nextUrl.clone();
          url.pathname = "/dashboard";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
    })
  : () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
