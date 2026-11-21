import type { NextConfig } from "next";

if (process.env.VERCEL_ENV === "production") {
  const apiOrigin = URL.parse(process.env.NEXT_PUBLIC_API_URL || "");
  if (!apiOrigin || apiOrigin.protocol !== "https:" ||
      /^(localhost|127\.|0\.0\.0\.0$|\[::1\]$)/i.test(apiOrigin.hostname) ||
      apiOrigin.origin !== apiOrigin.href.replace(/\/$/, "")) {
    throw new Error("Set NEXT_PUBLIC_API_URL to the public HTTPS backend origin before deploying.");
  }
}

const nextConfig: NextConfig = {
  // Hosted on Vercel (server build); no static export or base path.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
