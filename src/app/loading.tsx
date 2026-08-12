import { BrandedLoader } from "@/components/ui/BrandedLoader";

/**
 * Root-level loading boundary — the fallback shown while navigating to a
 * route segment that hasn't started streaming its own (more tailored)
 * loading.tsx yet, or has none. Every route that already has its own
 * skeleton (dashboard, community, matches, ...) still uses that; this only
 * covers the gap between them.
 */
export default function RootLoading() {
  return <BrandedLoader label="Loading United Fans Hub" />;
}
