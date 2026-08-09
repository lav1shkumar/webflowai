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

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
