import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Season data is read from disk at request time; make sure deployments ship it.
  outputFileTracingIncludes: {
    // The daily roll runs in the home page's Server Action.
    "/": ["./data/seasons/**"],
    // The player-dex counts every rollable player; roll pages rank a score
    // against every season.
    "/profile/**": ["./data/seasons/**"],
    // Roll pages and their preview images; the images also read the fonts.
    "/rolls/**": ["./data/seasons/**", "./assets/fonts/*.ttf"],
    "/api/**": ["./data/seasons/**"],
    // Link preview images (src/lib/og.tsx).
    "/opengraph-image": ["./assets/fonts/*.ttf"],
    "/leaderboard/**": ["./assets/fonts/*.ttf"],
  },
  async redirects() {
    // The sandbox started out as the /dev/roll prototype.
    return [{ source: "/dev/roll", destination: "/sandbox", permanent: true }];
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
