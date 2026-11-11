import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Restarting `next dev` on the previous session's cache can reload a page in an endless loop
    // (https://github.com/vercel/next.js/issues/100267). Dev starts a little slower without it.
    turbopackFileSystemCacheForDev: false,
  },
  // Pages from before the V2 design keep working.
  async redirects() {
    return [
      { source: "/control-room", destination: "/money", permanent: false },
      { source: "/rules", destination: "/leash", permanent: false },
      { source: "/people", destination: "/leash/people", permanent: false },
      { source: "/restocks", destination: "/leash/restocks", permanent: false },
      { source: "/connect", destination: "/leash/paypal", permanent: false },
    ];
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
