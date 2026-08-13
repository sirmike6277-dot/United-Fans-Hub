import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { LeaderboardEntry } from "@/lib/leaderboard/leaderboard";

export interface RankingsPreviewProps {
  entries: LeaderboardEntry[];
}

/**
 * Was a hardcoded, fabricated leaderboard (four invented usernames/point
 * totals) presented as if it were real — flagged in the Phase 12 audit,
 * fixed here (Phase 15). Now reuses the exact same fetchFanLeaderboard()
 * query every real leaderboard in the app already uses (profiles are
 * publicly readable, so this works for a signed-out visitor too). An empty
 * result renders an honest "not started yet" message, never a fabricated
 * name.
 */
export function RankingsPreview({ entries }: RankingsPreviewProps) {
  return (
    <section id="rankings" className="bg-bg-void py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <Card className="mx-auto w-full max-w-md order-2 lg:order-1">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            Fan Leaderboard
          </h3>
          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">
              The leaderboard is just getting started — be one of the first names on it.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {entries.map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-control bg-bg-elevated px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {/* A 0-point entry hasn't actually out-ranked anyone —
                        see LeaderboardRow's matching note — so it gets "—",
                        never a fabricated "#1" from the tie-break alone. */}
                    <span className="font-display text-sm font-bold text-red-primary">
                      {entry.fan_points > 0 ? `#${index + 1}` : "—"}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {entry.display_name || entry.username}
                    </span>
                  </div>
                  <span className="text-sm text-text-muted">{entry.fan_points.toLocaleString()} pts</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="order-1 lg:order-2">
          <Badge tone="red">Fan Rankings</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase text-white sm:text-4xl">
            Prove you&apos;re the ultimate fan
          </h2>
          <p className="mt-4 max-w-md text-text-muted">
            Every correct prediction pushes you up the real leaderboard. Compete season-long for
            a spot at the top.
          </p>
        </div>
      </div>
    </section>
  );
}
