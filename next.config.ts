import type { NextConfig } from "next";

// Use Next.js's normal environment loading: injected production secrets take
// precedence over local .env files, including after a credential rotation.

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
