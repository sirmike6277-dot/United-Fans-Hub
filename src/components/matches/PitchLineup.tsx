import { ClubEmblem } from "@/components/media/ClubEmblem";
import type { LineupEntry } from "@/lib/matches/matches";

export interface PitchLineupProps {
  entries: LineupEntry[];
  manUtdClubId: string;
  opponentName: string;
}

interface Row {
  label: string;
  players: LineupEntry[];
}

/**
 * Groups Manchester United's real starting XI by their actual recorded
 * `position` (Goalkeeper/Defender/Midfielder/Attacker — from the squad
 * sync). Real data, real rows — this is the one side of the pitch this
 * app can honestly claim a tactical shape for.
 */
function groupManUtdRows(starting: LineupEntry[]): Row[] {
  const byPosition = (pos: string) => starting.filter((e) => e.position === pos);
  return [
    { label: "GK", players: byPosition("Goalkeeper") },
    { label: "DEF", players: byPosition("Defender") },
    { label: "MID", players: byPosition("Midfielder") },
    { label: "FWD", players: byPosition("Attacker") },
  ].filter((row) => row.players.length > 0);
}

/**
 * The opponent's squad is never synced (this app only tracks Manchester
 * United's own squad — see sync.ts), so there's no real `position` for any
 * of these players. Rather than guess a back-four/midfield-three shape
 * this app doesn't actually know, the opponent's XI is shown as a neat,
 * evenly-wrapped grid — shirt number 1 pulled out front as keeper (a real,
 * near-universal convention, not a guess), everyone else in two plain
 * rows, no tactical label implied.
 */
function groupOpponentRows(starting: LineupEntry[]): Row[] {
  const keeper = starting.find((e) => e.shirtNumber === 1);
  const rest = starting.filter((e) => e !== keeper);
  const mid = Math.ceil(rest.length / 2);
  return [
    keeper ? { label: "GK", players: [keeper] } : null,
    rest.length > 0 ? { label: "XI", players: rest.slice(0, mid) } : null,
    rest.length > mid ? { label: "XI", players: rest.slice(mid) } : null,
  ].filter((row): row is Row => row !== null && row.players.length > 0);
}

function PlayerChip({ entry, tone }: { entry: LineupEntry; tone: "red" | "dark" }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 64 }}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${
          tone === "red" ? "border-white bg-red-primary text-white" : "border-white/70 bg-[#171923] text-white"
        }`}
      >
        {entry.shirtNumber ?? "-"}
      </span>
      <span className="line-clamp-1 max-w-[64px] text-center text-[10px] font-medium leading-tight text-white/90">
        {entry.playerName}
      </span>
    </div>
  );
}

function PitchRow({ row, tone }: { row: Row; tone: "red" | "dark" }) {
  return (
    <div className="flex w-full items-start justify-evenly">
      {row.players.map((entry) => (
        <PlayerChip key={entry.id} entry={entry} tone={tone} />
      ))}
    </div>
  );
}

function BenchList({ title, players }: { title: string; players: LineupEntry[] }) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm text-text-body">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-text-muted">
              {p.shirtNumber ?? "-"}
            </span>
            <span className="truncate">{p.playerName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A real-11-vs-real-11 pitch view: Manchester United's actual synced
 * starting XI (grouped by their real position) at the bottom attacking up,
 * the opponent's actual starting XI at the top, both from API-Football's
 * lineups endpoint (see migration add_match_lineups) — not fabricated
 * placeholder names or invented formations.
 */
export function PitchLineup({ entries, manUtdClubId, opponentName }: PitchLineupProps) {
  const manUtd = entries.filter((e) => e.clubId === manUtdClubId);
  const opponent = entries.filter((e) => e.clubId !== manUtdClubId);

  const manUtdStarting = manUtd.filter((e) => e.isStarting);
  const manUtdSubs = manUtd.filter((e) => !e.isStarting);
  const opponentStarting = opponent.filter((e) => e.isStarting);
  const opponentSubs = opponent.filter((e) => !e.isStarting);

  if (manUtdStarting.length === 0 && opponentStarting.length === 0) {
    return (
      <div className="rounded-card border border-white/10 bg-bg-surface p-8 text-center text-sm text-text-muted">
        The lineup isn&apos;t published yet — it usually lands shortly before kickoff.
      </div>
    );
  }

  const manUtdRows = groupManUtdRows(manUtdStarting);
  const opponentRows = groupOpponentRows(opponentStarting);
  const formation = manUtd.find((e) => e.formation)?.formation ?? null;
  const opponentFormation = opponent.find((e) => e.formation)?.formation ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="relative overflow-hidden rounded-card border border-white/10"
        style={{
          background:
            "repeating-linear-gradient(180deg, #1c6b3a 0 40px, #1a6236 40px 80px)",
        }}
      >
        {/* Pitch markings — halfway line, centre circle, both penalty boxes */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 400 600"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="388" height="588" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          <line x1="6" y1="300" x2="394" y2="300" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          <circle cx="200" cy="300" r="55" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          <circle cx="200" cy="300" r="2.5" fill="white" fillOpacity="0.55" />
          {/* top (opponent) penalty area */}
          <rect x="90" y="6" width="220" height="90" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          <rect x="150" y="6" width="100" height="36" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          {/* bottom (Man Utd) penalty area */}
          <rect x="90" y="504" width="220" height="90" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
          <rect x="150" y="558" width="100" height="36" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
        </svg>

        <div className="relative flex flex-col justify-between gap-3 p-4 sm:p-6" style={{ minHeight: 420 }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
              <span>{opponentName}</span>
              <span>{opponentFormation ?? ""}</span>
            </div>
            {opponentRows.map((row, i) => (
              <PitchRow key={`opp-${i}`} row={row} tone="dark" />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {[...manUtdRows].reverse().map((row, i) => (
              <PitchRow key={`mu-${i}`} row={row} tone="red" />
            ))}
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <ClubEmblem size={16} /> Manchester United
              </span>
              <span>{formation ?? ""}</span>
            </div>
          </div>
        </div>
      </div>

      {manUtdSubs.length > 0 || opponentSubs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BenchList title="Manchester United — Substitutes" players={manUtdSubs} />
          <BenchList title={`${opponentName} — Substitutes`} players={opponentSubs} />
        </div>
      ) : null}
    </div>
  );
}
