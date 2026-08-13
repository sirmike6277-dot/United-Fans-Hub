import { Card } from "@/components/ui/Card";
import { SubOnBadge } from "./MatchIcons";
import type { LineupEntry, MatchEvent } from "@/lib/matches/matches";

export interface SubstitutePlayersPanelProps {
  entries: LineupEntry[];
  events: MatchEvent[];
  manUtdClubId: string;
  opponentName: string;
}

/** Real names of every player who actually came on as a substitute (from `detail.assist_player_name` on a real substitution event) — used to mark the bench, since a bench entry alone doesn't say whether that fan actually saw the pitch. Matched by name (the only identifier the provider gives for the incoming player), not id. */
function readIncomingSubNames(events: MatchEvent[]): Set<string> {
  const names = new Set<string>();
  for (const event of events) {
    if (event.eventType !== "substitution") continue;
    const detail = event.detail;
    if (typeof detail === "object" && detail !== null) {
      const name = (detail as Record<string, unknown>).assist_player_name;
      if (typeof name === "string") names.add(name);
    }
  }
  return names;
}

function SubRow({ player, cameOn }: { player: LineupEntry; cameOn: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-text-body">
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
        {player.shirtNumber ?? "-"}
        {cameOn ? (
          <span className="absolute -bottom-1 -right-1">
            <SubOnBadge size={13} />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-white">{player.playerName}</span>
      {player.position ? <span className="shrink-0 text-xs text-text-muted">{player.position}</span> : null}
    </li>
  );
}

/**
 * The full bench for both teams — every named substitute, not only those
 * who actually came on (see SubOnBadge for that distinction) — as its own
 * dedicated card, matching the reference design's separate "Substitute
 * players" panel (distinct from PitchLineup's on-pitch XI and from
 * SubstitutionsPanel's list of the swaps that actually happened). Real
 * squad `position` only exists for Manchester United's own synced squad
 * (see LineupEntry.position) — an opponent bench row simply omits it
 * rather than guessing.
 */
export function SubstitutePlayersPanel({ entries, events, manUtdClubId, opponentName }: SubstitutePlayersPanelProps) {
  const manUtdSubs = entries.filter((e) => e.clubId === manUtdClubId && !e.isStarting);
  const opponentSubs = entries.filter((e) => e.clubId !== manUtdClubId && !e.isStarting);

  if (manUtdSubs.length === 0 && opponentSubs.length === 0) return null;

  const cameOnNames = readIncomingSubNames(events);

  return (
    <Card>
      <h3 className="font-display text-base font-bold uppercase text-white">Substitute players</h3>
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Manchester United</p>
          <ul className="flex flex-col gap-2.5">
            {manUtdSubs.map((p) => (
              <SubRow key={p.id} player={p} cameOn={cameOnNames.has(p.playerName)} />
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{opponentName}</p>
          <ul className="flex flex-col gap-2.5">
            {opponentSubs.map((p) => (
              <SubRow key={p.id} player={p} cameOn={cameOnNames.has(p.playerName)} />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
