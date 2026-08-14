import { Card } from "@/components/ui/Card";
import { SubOffBadge, SubOnBadge } from "./MatchIcons";
import type { LineupEntry, MatchEvent } from "@/lib/matches/matches";

export interface SubstitutionsPanelProps {
  events: MatchEvent[];
  entries: LineupEntry[];
  manUtdClubId: string;
  opponentName: string;
}

interface SubRow {
  minute: number | null;
  offName: string;
  offShirt: number | null;
  onName: string | null;
  onShirt: number | null;
  isManUtd: boolean;
}

/** `detail.assist_player_name` on a substitution event is API-Football's own field for the player coming ON — see EventTimeline's identical reading of this. */
function readOnName(detail: unknown): string | null {
  if (typeof detail !== "object" || detail === null) return null;
  const name = (detail as Record<string, unknown>).assist_player_name;
  return typeof name === "string" ? name : null;
}

function OneSub({ row }: { row: SubRow }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-9 shrink-0 text-sm font-bold tabular-nums text-text-muted">
        {row.minute !== null ? `${row.minute}'` : "—"}
      </span>
      <div className="flex flex-1 flex-col gap-1.5 text-sm">
        {row.onName ? (
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <SubOnBadge size={16} />
            {row.onShirt ? <span className="text-text-muted">#{row.onShirt}</span> : null} {row.onName}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5 text-text-muted">
          <SubOffBadge size={16} />
          {row.offShirt ? <span>#{row.offShirt}</span> : null} {row.offName}
        </span>
      </div>
    </div>
  );
}

/**
 * A dedicated, compact substitutions list — every real swap this match had,
 * grouped by minute, split by team — alongside (not instead of) the fuller
 * Match Events timeline, matching the reference design's own separate
 * "Substitutions" panel.
 */
export function SubstitutionsPanel({ events, entries, manUtdClubId, opponentName }: SubstitutionsPanelProps) {
  const manUtdIds = new Set(entries.filter((e) => e.clubId === manUtdClubId && e.playerId).map((e) => e.playerId));
  const shirtByName = new Map(entries.map((e) => [e.playerName, e.shirtNumber]));

  const rows: SubRow[] = events
    .filter((e) => e.eventType === "substitution" && e.player)
    .map((e) => {
      const onName = readOnName(e.detail);
      return {
        minute: e.minute,
        offName: e.player!.fullName,
        offShirt: e.player!.shirtNumber,
        onName,
        onShirt: onName ? (shirtByName.get(onName) ?? null) : null,
        isManUtd: manUtdIds.has(e.player!.id),
      };
    })
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  if (rows.length === 0) return null;

  const manUtdRows = rows.filter((r) => r.isManUtd);
  const opponentRows = rows.filter((r) => !r.isManUtd);

  return (
    <Card>
      <h3 className="font-display text-base font-bold uppercase text-ink">Substitutions</h3>
      <div className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <div className="divide-y divide-ink/10">
          {manUtdRows.map((row, i) => (
            <OneSub key={i} row={row} />
          ))}
        </div>
        <div className="divide-y divide-ink/10 border-t border-ink/10 pt-0 sm:border-t-0 sm:pt-0">
          {opponentRows.map((row, i) => (
            <OneSub key={i} row={row} />
          ))}
        </div>
      </div>
      {opponentRows.length > 0 ? (
        <p className="mt-1 text-xs text-text-muted sm:hidden">{opponentName} substitutions above.</p>
      ) : null}
    </Card>
  );
}
