import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables React's <ViewTransition> for native crossfades on navigation.
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      // Supabase Storage (repo previews live in a public bucket).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
  // OG image routes read the brand TTFs at runtime — make sure they're bundled.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./lib/fonts/**"],
    "/[username]/[slug]/opengraph-image": ["./lib/fonts/**"],
    "/u/[username]/opengraph-image": ["./lib/fonts/**"],
  },
};

export default nextConfig;
