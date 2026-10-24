import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Season data is read from disk at request time; make sure deployments ship it.
  outputFileTracingIncludes: {
    // The daily roll runs in the home page's Server Action.
    "/": ["./data/seasons/**"],
    "/api/**": ["./data/seasons/**"],
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
