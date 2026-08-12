import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { fetchUpcomingMatches } from "@/lib/matches/matches";
import { formatMatchDateTime } from "@/lib/format";

/**
 * Days/hours/minutes remaining until kickoff, computed at render time from
 * the real synced kickoff_at — not a live-ticking countdown (that would
 * need client-side JS/an interval, which is out of scope here: this
 * component stays a server component, reusing the same fetchUpcomingMatches()
 * data layer as /matches, per the "no separate data-fetching architecture"
 * instruction). Clamped to zero rather than going negative.
 */
function countdownParts(kickoffAtIso: string) {
  const diffMs = Math.max(0, new Date(kickoffAtIso).getTime() - Date.now());
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  return [
    { value: String(days).padStart(2, "0"), label: "Days" },
    { value: String(hours).padStart(2, "0"), label: "Hours" },
    { value: String(mins).padStart(2, "0"), label: "Mins" },
  ];
}

/**
 * Real next-fixture preview, reusing the exact same matches.ts data layer
 * /matches uses — no fabricated fixture, no duplicate fetching
 * architecture. Falls back to an honest empty state if there's genuinely
 * no upcoming fixture (e.g. nothing synced yet).
 */
export async function MatchdayPreview() {
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  const nextMatch = club
    ? (await fetchUpcomingMatches(supabase, { clubId: club.id, limit: 1 })).matches[0] ?? null
    : null;

  const homeLabel = nextMatch?.isHome ? "Man United" : nextMatch?.opponentName;
  const awayLabel = nextMatch?.isHome ? nextMatch?.opponentName : "Man United";

  return (
    <section id="matchday" className="bg-bg-elevated py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <Badge tone="red">Match Centre</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase text-white sm:text-4xl">
            Never miss a matchday
          </h2>
          <p className="mt-4 max-w-md text-text-muted">
            Fixtures, countdowns, starting XI, live events, and player ratings — the full
            matchday experience, built for the community around it.
          </p>
        </div>

        <Card featured className="mx-auto w-full max-w-md">
          {nextMatch ? (
            <>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                <span>{nextMatch.competition ?? "Manchester United"}</span>
                <span>{nextMatch.venue ?? ""}</span>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full border border-white/15 bg-white/5" aria-hidden="true" />
                  <span className="text-sm font-semibold text-white">{homeLabel}</span>
                </div>
                <span className="font-display text-lg font-bold text-text-muted">VS</span>
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full border border-white/15 bg-white/5" aria-hidden="true" />
                  <span className="text-sm font-semibold text-white">{awayLabel}</span>
                </div>
              </div>

              {nextMatch.status === "live" ? (
                <div className="mt-6 flex justify-center rounded-control bg-bg-void py-4">
                  <span className="font-display text-lg font-bold text-red-primary">Live now</span>
                </div>
              ) : (
                <div className="mt-6 flex justify-center gap-6 rounded-control bg-bg-void py-4">
                  {countdownParts(nextMatch.kickoffAt).map((c) => (
                    <div key={c.label} className="flex flex-col items-center">
                      <span className="font-display text-2xl font-bold text-white">{c.value}</span>
                      <span className="text-[10px] uppercase tracking-wide text-text-muted">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 text-center text-xs text-text-muted">
                {formatMatchDateTime(nextMatch.kickoffAt)}
              </p>

              <Button href="/matches" className="mt-6 w-full">
                View Match Centre
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-text-muted">No upcoming fixture is scheduled right now.</p>
              <Button href="/matches" variant="secondary">
                Visit Match Centre
              </Button>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
