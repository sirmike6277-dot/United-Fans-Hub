import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — otherwise Next.js's lockfile
  // detection can walk up to an unrelated package-lock.json higher in the
  // filesystem (e.g. the user's home directory) and misidentify the root.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        // Public bucket URLs (avatars, covers, post-media).
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Signed URLs for the private message-media/voice-messages buckets
        // (Phase 6 messaging) — a different path shape from public URLs,
        // since these buckets are private and must never use getPublicUrl().
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        // API-Football's own crest CDN — this app has no local opponent
        // emblem asset (see ClubEmblem/OpponentEmblem's no-fake-emblem
        // rule), so an opponent's real crest is hotlinked live from the
        // same paid provider already used for match data, never stored.
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/football/teams/**",
      },
    ],
  },
};

export default nextConfig;
