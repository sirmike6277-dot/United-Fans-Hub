import type { MatchSummary } from "@/lib/matches/matches";
import { formatMatchDateTime } from "@/lib/format";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { SoccerBallIcon } from "./MatchIcons";

/** The real emblem next to whichever label says "Man Utd" — the opponent side stays text-only (no licensed crest for any other club, same rule ClubEmblem itself documents). */
function TeamLabel({ label, isManUtd, bold }: { label: string; isManUtd: boolean; bold: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${bold ? "font-semibold text-white" : "text-text-body"}`}>
      {isManUtd ? <ClubEmblem size={18} /> : null}
      {label}
    </span>
  );
}

export interface ScoreDisplayProps {
  match: MatchSummary;
  size?: "sm" | "lg";
}

/**
 * Home team is always shown first, away second — home_score/away_score
 * already map directly to that order regardless of which side Manchester
 * United was on, so no swapping is needed, only which label gets the
 * "Man Utd" substitution (via match.isHome).
 */
export function ScoreDisplay({ match, size = "sm" }: ScoreDisplayProps) {
  const homeLabel = match.isHome ? "Man Utd" : match.opponentName;
  const awayLabel = match.isHome ? match.opponentName : "Man Utd";
  const scoreTextSize = size === "lg" ? "text-3xl sm:text-4xl" : "text-lg";
  const nameTextSize = size === "lg" ? "text-base sm:text-lg" : "text-sm";
  const ballSize = size === "lg" ? 22 : 16;

  if (match.status === "postponed" || match.status === "cancelled") {
    return (
      <div className={`flex items-center justify-center gap-3 ${nameTextSize} text-text-muted`}>
        <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={false} />
        <SoccerBallIcon size={ballSize} />
        <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={false} />
      </div>
    );
  }

  if (match.status === "scheduled") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`flex items-center justify-center gap-3 ${nameTextSize}`}>
          <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={match.isHome} />
          <SoccerBallIcon size={ballSize} />
          <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={!match.isHome} />
        </div>
        <time dateTime={match.kickoffAt} className="text-xs text-text-muted">
          {formatMatchDateTime(match.kickoffAt)}
        </time>
      </div>
    );
  }

  // live or finished — an in-progress fixture may still have null scores
  // if 0-0, which is a real value, not "no data" — the ?? fallback below
  // is only for the genuinely-unset case (shouldn't happen once synced,
  // but never render a blank scoreline).
  return (
    <div className={`flex items-center justify-center gap-3 ${nameTextSize}`}>
      <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={match.isHome} />
      <span className={`font-display font-bold text-white ${scoreTextSize}`}>
        {match.homeScore ?? 0}&ndash;{match.awayScore ?? 0}
      </span>
      <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={!match.isHome} />
    </div>
  );
}
