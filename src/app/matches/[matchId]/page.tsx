import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PullQuote } from "@/components/ui/PullQuote";
import { MatchDetailHeader } from "@/components/matches/MatchDetailHeader";
import { EventTimeline } from "@/components/matches/EventTimeline";
import { PitchLineup } from "@/components/matches/PitchLineup";
import { SubstitutionsPanel } from "@/components/matches/SubstitutionsPanel";
import { SubstitutePlayersPanel } from "@/components/matches/SubstitutePlayersPanel";
import { PredictionSection } from "@/components/predictions/PredictionSection";
import { fetchMatchById, fetchMatchLineups } from "@/lib/matches/matches";
import { maybeSyncMatchEvents, maybeSyncMatchLineups, maybeSyncSquad } from "@/lib/matches/sync";
import { fetchManUtdSquad, fetchPredictionForMatch, settlePredictionIfEligible } from "@/lib/predictions/predictions";

export const metadata: Metadata = {
  title: "Match Details — United Fans Hub",
};

/**
 * Public route — not gated in src/proxy.ts (see /matches/page.tsx). Also
 * checks auth (read-only) purely to choose a shell, same fix and same
 * reasoning as /matches/page.tsx — this page previously always dropped the
 * Sidebar/AppShell for everyone, signed in or not, which read as "the whole
 * app's navigation disappeared" the moment you opened a result.
 */
export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();

  const { match: initialMatch } = await fetchMatchById(supabase, matchId);

  if (!initialMatch) {
    notFound();
  }

  // Writes internally via a service-role client (see sync.ts) — this runs
  // on behalf of the system, not this (possibly anonymous) visitor. Club
  // attribution for each event's player is now resolved per-event from
  // the provider's own team id (see sync.ts), not from Manchester
  // United's club id — this page no longer needs to look that up.
  const [, lineupSync] = await Promise.all([
    maybeSyncMatchEvents({
      matchId: initialMatch.id,
      externalRef: initialMatch.externalRef,
      isLive: initialMatch.status === "live",
    }),
    maybeSyncMatchLineups({
      matchId: initialMatch.id,
      externalRef: initialMatch.externalRef,
      isLive: initialMatch.status === "live",
    }),
  ]);

  // Re-fetch after the (possible) sync so any freshly-synced events render
  // in this same request rather than only on the next visit.
  const { match } = await fetchMatchById(supabase, matchId);
  const current = match ?? initialMatch;

  // Man Utd's club row — needed to scope the prediction player pool (only
  // ever the Man Utd squad, per the approved V1 decision), to keep it
  // synced, and to tell the pitch view which lineup entries are "ours".
  const { data: club } = await supabase.from("clubs").select("id").eq("slug", "manchester-united").single();

  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims.sub ?? null;

  let squad: Awaited<ReturnType<typeof fetchManUtdSquad>>["players"] = [];
  let initialPrediction = null;

  if (club) {
    // Lazy revalidation, same pattern as maybeSyncFixtures — a no-op when
    // recently synced, writes via a service-role client on the system's
    // behalf, never blocks rendering on failure.
    await maybeSyncSquad({ clubId: club.id });
    const { players } = await fetchManUtdSquad(supabase, { clubId: club.id });
    squad = players;

    if (profileId) {
      const { prediction } = await fetchPredictionForMatch(supabase, { matchId: current.id, profileId });
      initialPrediction = prediction;

      // Opportunistic settlement: safe to call speculatively for any
      // prediction on any match, since settle_prediction() itself checks
      // ownership and requires the match to be finished — a no-op here
      // otherwise. Re-fetch afterward so a freshly-awarded score renders
      // in this same request rather than only on the next visit.
      if (prediction && !prediction.score && current.status === "finished") {
        await settlePredictionIfEligible(supabase, prediction.id);
        const { prediction: settled } = await fetchPredictionForMatch(supabase, { matchId: current.id, profileId });
        initialPrediction = settled;
      }
    }
  }

  const { entries: lineupEntries } = await fetchMatchLineups(supabase, current.id);

  // `current.opponentExternalRef` (captured at fixture-sync time — see
  // matches.ts) is the primary source and is available immediately, even
  // before a lineup is published. The lineup-derived id is kept as a
  // fallback for the rare row synced before that column existed and never
  // backfilled.
  const opponentExternalRef =
    current.opponentExternalRef ??
    (club ? (lineupEntries.find((e) => e.clubId !== club.id && e.clubExternalRef)?.clubExternalRef ?? null) : null);

  const content = (
    <div className="flex flex-col gap-8 py-6 sm:py-8">
      <MatchDetailHeader match={current} opponentExternalRef={opponentExternalRef} />

      <PredictionSection
        matchId={current.id}
        profileId={profileId}
        opponentName={current.opponentName}
        isHome={current.isHome}
        kickoffAt={current.kickoffAt}
        squad={squad}
        initialPrediction={initialPrediction}
      />

      {club ? (
        <section>
          <h2 className="font-display text-lg font-bold uppercase text-white sm:text-xl">Lineups</h2>
          <div className="mt-3">
            <PitchLineup
              entries={lineupEntries}
              events={current.events}
              manUtdClubId={club.id}
              opponentName={current.opponentName}
              lineupFetchFailed={lineupSync.recentlyFailed}
            />
          </div>
        </section>
      ) : null}

      {club ? (
        <SubstitutionsPanel
          events={current.events}
          entries={lineupEntries}
          manUtdClubId={club.id}
          opponentName={current.opponentName}
        />
      ) : null}

      {club ? (
        <SubstitutePlayersPanel
          entries={lineupEntries}
          events={current.events}
          manUtdClubId={club.id}
          opponentName={current.opponentName}
        />
      ) : null}

      <section>
        <h2 className="font-display text-lg font-bold uppercase text-white sm:text-xl">Match Events</h2>
        <div className="mt-3">
          <EventTimeline events={current.events} />
        </div>
      </section>
    </div>
  );

  const rail = (
    <Card>
      <PullQuote
        quote="Attack wins you games, defence wins you titles."
        attribution="Sir Alex Ferguson"
      />
    </Card>
  );

  if (profileId) {
    return (
      <AppShell rail={rail}>
        <main className="flex-1 bg-bg-void">
          <div className="max-w-3xl">{content}</div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">{content}</div>
      </main>
      <Footer />
    </>
  );
}
