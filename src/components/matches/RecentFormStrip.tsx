import Link from "next/link";
import type { MatchSummary } from "@/lib/matches/matches";

function resultFor(match: MatchSummary): "W" | "D" | "L" | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  const us = match.isHome ? match.homeScore : match.awayScore;
  const them = match.isHome ? match.awayScore : match.homeScore;
  if (us === them) return "D";
  return us > them ? "W" : "L";
}

const RESULT_STYLE: Record<"W" | "D" | "L", string> = {
  W: "bg-green-600/80 text-ink",
  D: "bg-ink/15 text-ink",
  L: "bg-red-hover/80 text-white",
};

/**
 * Manchester United's own real form — derived from already-fetched finished
 * matches (home_score/away_score/is_home), oldest of the batch first so it
 * reads left-to-right like a form guide. The reference design also shows
 * the opponent's form on the same row; this app only syncs Manchester
 * United's fixtures (see sync.ts), so there's no real data for any other
 * club's form to show without fabricating it.
 */
export function RecentFormStrip({ matches }: { matches: MatchSummary[] }) {
  const withResults = matches
    .map((m) => ({ match: m, result: resultFor(m) }))
    .filter((r): r is { match: MatchSummary; result: "W" | "D" | "L" } => r.result !== null)
    .slice(0, 5)
    .reverse();

  if (withResults.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {withResults.map(({ match, result }) => (
        <Link
          key={match.id}
          href={`/matches/${match.id}`}
          aria-label={`${result === "W" ? "Won" : result === "D" ? "Drew" : "Lost"} vs ${match.opponentName}, ${match.homeScore}-${match.awayScore}`}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-110 ${RESULT_STYLE[result]}`}
        >
          {result}
        </Link>
      ))}
    </div>
  );
}
