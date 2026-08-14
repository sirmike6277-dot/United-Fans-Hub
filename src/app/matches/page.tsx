import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { AppShell } from "@/components/layout/AppShell";
import { FixtureList } from "@/components/matches/FixtureList";
import { MatchOverviewCard } from "@/components/matches/MatchOverviewCard";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { Tabs } from "@/components/ui/Tabs";
import { fetchUpcomingMatches, fetchRecentResults } from "@/lib/matches/matches";
import { maybeSyncFixtures } from "@/lib/matches/sync";

export const metadata: Metadata = {
  title: "Match Centre — United Fans Hub",
};

/**
 * Public route — deliberately not gated in src/proxy.ts. The underlying
 * data is already public-read via RLS, and this mirrors the landing
 * page's existing signed-out "Predict this match" CTA, which assumes
 * fixture browsing doesn't require an account.
 *
 * Still checks auth (read-only, no redirect) purely to choose a shell: a
 * signed-in fan gets the same persistent Sidebar every other page gives
 * them — Match Centre was the one page that silently dropped it, because
 * it predates AppShell and was never migrated. A signed-out visitor keeps
 * the plain Navbar/Footer wrapper, since Sidebar's links all require an
 * account anyway.
 */
export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const signedIn = Boolean(claimsData?.claims.sub);

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  if (!club) {
    const unavailable = (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-text-muted">Match Centre isn&apos;t available right now.</p>
      </div>
    );
    return signedIn ? (
      <AppShell>
        <main className="flex-1 bg-bg-void">{unavailable}</main>
      </AppShell>
    ) : (
      <>
        <Navbar brand={<Brand />} />
        <main className="flex-1 bg-bg-void">{unavailable}</main>
        <Footer />
      </>
    );
  }

  // Lazy revalidation — a no-op when recently synced; never blocks
  // rendering on failure (falls through to whatever's already cached).
  // Writes internally via a service-role client (see sync.ts) since this
  // runs on behalf of the system, not this (possibly anonymous) visitor.
  await maybeSyncFixtures({ clubId: club.id });

  // `recent` feeds two very different views from one fetch: the Overview
  // tab's compact "Recent Form" strip (RecentFormStrip already does its
  // own internal `.slice(0, 5)`, so a longer list here doesn't change that
  // widget at all) and the Results tab's full FixtureList grid. A real,
  // previously-hidden gap: both used to share fetchRecentResults' default
  // RECENT_RESULTS_LIMIT of 5, so the dedicated Results tab — a user's
  // only way to browse this club's match history — could only ever show
  // the exact same 5 matches as the small form strip, even though this
  // club has 68 finished matches on record. Raised well past the current
  // real count for headroom; still a single, cheap query (this table has
  // no pagination anywhere else in the app either — see FixtureList's own
  // doc comment — so "fetch everything, render it all" matches the rest
  // of v1's approach rather than introducing pagination UI on its own).
  const RESULTS_TAB_LIMIT = 200;
  const [{ matches: upcoming, error: upcomingError }, { matches: recent, error: recentError }] = await Promise.all([
    fetchUpcomingMatches(supabase, { clubId: club.id }),
    fetchRecentResults(supabase, { clubId: club.id, limit: RESULTS_TAB_LIMIT }),
  ]);

  const content = (
    <>
      <SectionBanner
        imageSrc="/images/stadium/old-trafford-exterior-sunset.jpg"
        imageAlt="Old Trafford's forecourt at sunset, the 'The Reds Go Marching On' mural lit up on the stadium wall"
        kicker="Match Centre"
        title="Every fixture. Every result. Matchday starts here."
        quote={{
          quote: "At Manchester United we don't just try to win, we try to win with style.",
          attribution: "Sir Matt Busby",
        }}
      />

      <Tabs
        sticky
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: <MatchOverviewCard nextMatch={upcoming[0] ?? null} recentResults={recent} />,
          },
          {
            key: "fixtures",
            label: "Fixtures",
            content: (
              <FixtureList
                title="Upcoming Fixtures"
                matches={upcoming}
                error={upcomingError}
                emptyMessage="No upcoming fixtures scheduled yet."
              />
            ),
          },
          {
            key: "results",
            label: "Results",
            content: (
              <FixtureList
                title="Recent Results"
                matches={recent}
                error={recentError}
                emptyMessage="No recent results yet."
              />
            ),
          },
        ]}
      />
    </>
  );

  if (signedIn) {
    return (
      <AppShell>
        <main className="flex-1 bg-bg-void">
          <div className="flex flex-col gap-8 py-6 sm:py-8">{content}</div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">{content}</div>
      </main>
      <Footer />
    </>
  );
}
