import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Restarting `next dev` on the previous session's cache can reload a page in an endless loop
    // (https://github.com/vercel/next.js/issues/100267). Dev starts a little slower without it.
    turbopackFileSystemCacheForDev: false,
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
