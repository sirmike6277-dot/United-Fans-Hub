import type { MatchSummary } from "@/lib/matches/matches";
import { TeamCrest } from "@/components/media/TeamCrest";
import { SoccerBallIcon } from "./MatchIcons";

/**
 * Real crest on both sides via the shared TeamCrest component — Manchester
 * United's own licensed asset, the opponent's real crest hotlinked from
 * API-Football (falling back to a neutral initials placeholder, never a
 * blank gap, whenever their id isn't known yet or the image fails to
 * load).
 */
function TeamLabel({
  label,
  isManUtd,
  bold,
  emblemSize = 22,
  opponentExternalRef,
}: {
  label: string;
  isManUtd: boolean;
  bold: boolean;
  emblemSize?: number;
  opponentExternalRef?: string | null;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${bold ? "font-semibold text-ink" : "text-text-body"}`}>
      {isManUtd ? (
        <TeamCrest variant="manUtd" name="Manchester United" size={emblemSize} />
      ) : (
        <TeamCrest variant="opponent" externalRef={opponentExternalRef} name={label} size={emblemSize} />
      )}
      {label}
    </span>
  );
}

export interface ScoreDisplayProps {
  match: MatchSummary;
  size?: "sm" | "lg";
  /** API-Football's numeric team id for the opponent — defaults to `match.opponentExternalRef` (captured at fixture-sync time, see matches.ts), so this only needs overriding where a caller has resolved a more specific value (e.g. from a published lineup). */
  opponentExternalRef?: string | null;
}

/**
 * Home team is always shown first, away second — home_score/away_score
 * already map directly to that order regardless of which side Manchester
 * United was on, so no swapping is needed, only which label gets the
 * "Man Utd" substitution (via match.isHome).
 *
 * Deliberately never renders a date/time itself — a real bug this fixes:
 * this component used to render one, but only inside its own
 * `status === "scheduled"` branch, so MatchCard (list-view — every match
 * in this app is currently "finished," so this path never fired) showed
 * no date at all, while MatchDetailHeader (which has always rendered its
 * own separate date row regardless of status) would have shown the date
 * *twice* for a scheduled match. Date display is now each caller's own,
 * single responsibility — see MatchCard's and MatchDetailHeader's own
 * `<time>` elements.
 */
export function ScoreDisplay({ match, size = "sm", opponentExternalRef = match.opponentExternalRef }: ScoreDisplayProps) {
  const homeLabel = match.isHome ? "Man Utd" : match.opponentName;
  const awayLabel = match.isHome ? match.opponentName : "Man Utd";
  const scoreTextSize = size === "lg" ? "text-3xl sm:text-4xl" : "text-lg";
  const nameTextSize = size === "lg" ? "text-base sm:text-lg" : "text-sm";
  const ballSize = size === "lg" ? 22 : 16;
  const emblemSize = size === "lg" ? 34 : 22;

  if (match.status === "postponed" || match.status === "cancelled") {
    return (
      <div className={`flex items-center justify-center gap-3 ${nameTextSize} text-text-muted`}>
        <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={false} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
        <SoccerBallIcon size={ballSize} />
        <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={false} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
      </div>
    );
  }

  if (match.status === "scheduled") {
    return (
      <div className={`flex items-center justify-center gap-3 ${nameTextSize}`}>
        <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={match.isHome} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
        <SoccerBallIcon size={ballSize} />
        <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={!match.isHome} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
      </div>
    );
  }

  // live or finished — an in-progress fixture may still have null scores
  // if 0-0, which is a real value, not "no data" — the ?? fallback below
  // is only for the genuinely-unset case (shouldn't happen once synced,
  // but never render a blank scoreline).
  return (
    <div className={`flex items-center justify-center gap-3 ${nameTextSize}`}>
      <TeamLabel label={homeLabel} isManUtd={match.isHome} bold={match.isHome} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
      <span className={`font-display font-bold text-ink ${scoreTextSize}`}>
        {match.homeScore ?? 0}&ndash;{match.awayScore ?? 0}
      </span>
      <TeamLabel label={awayLabel} isManUtd={!match.isHome} bold={!match.isHome} emblemSize={emblemSize} opponentExternalRef={opponentExternalRef} />
    </div>
  );
}
