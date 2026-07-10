import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Routes that require an authenticated session. */
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/projects(.*)",
  "/templates(.*)",
  "/settings(.*)",
  "/workspace(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Health check must never depend on auth/Clerk — let it through untouched.
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const { userId, redirectToSignIn } = await auth();

  // Signed-out users hitting a protected route → sign-in
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Signed-in users on "/" → dashboard
  if (req.nextUrl.pathname === "/" && userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
