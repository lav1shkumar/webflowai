import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/ratelimit";

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
  const { userId, redirectToSignIn } = await auth();

  // Signed-out users hitting a protected route → sign-in
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Throttle API routes; handlers still do their own auth checks.
  if (req.nextUrl.pathname.startsWith("/api")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { allowed, retryAfter } = await checkRateLimit(
      req.nextUrl.pathname,
      userId,
      ip,
    );

    if (!allowed) {
      return Response.json(
        { error: "rate-limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
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
  runtime: "nodejs",
  matcher: [
    // Liveness must not depend on Clerk, Redis, or a shared probe rate limit.
    // Exclude only the exact health path, including its optional trailing slash.
    "/((?!api/health/?$|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/((?!health/?$).*)",
    "/trpc(.*)",
  ],
};
