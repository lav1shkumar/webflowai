import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";

/**
 * Make the project's `.env` authoritative.
 *
 * `dotenv` / `@next/env` never override variables that already exist in the
 * process environment. In some shells/sandboxes placeholder values (e.g. an
 * empty `OPENAI_API_KEY` or a default `WEBFLOWAI_MODEL`) are pre-exported and
 * would silently shadow `.env`. Loading with `override: true` here — before
 * the server modules evaluate — ensures the values you put in `.env` win.
 * No-op when `.env` is absent (e.g. managed production envs).
 */
loadEnv({ override: true });

/**
 * WebContainers require cross-origin isolation (SharedArrayBuffer).
 * We set COOP/COEP headers globally so the in-browser runtime can boot.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    // Cross-origin isolation is required only by the WebContainer runtime in
    // the workspace. Applying it globally would block third-party embeds
    // (Razorpay Checkout, Clerk widgets), so we scope it to /workspace.
    return [
      {
        source: "/workspace/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
