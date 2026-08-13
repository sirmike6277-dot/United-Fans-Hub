import type { LineupEntry } from "./matches";

/**
 * The shared normalization/validation layer for turning raw `LineupEntry`
 * rows (see matches.ts's fetchMatchLineups — the single DB read this
 * entire app uses for lineup data) into a real, honest tactical shape.
 * Previously this logic lived inside PitchLineup.tsx itself; extracted
 * here so any future consumer gets the same validated shape without
 * re-implementing grid parsing or formation derivation, and so a real
 * mismatch between the provider's own formation string and its own grid
 * data gets logged rather than silently rendered as a shape that
 * contradicts its own label.
 *
 * There is, as of this phase's audit, exactly one other place this data
 * flows through: `src/app/matches/[matchId]/page.tsx` calls
 * fetchMatchLineups() once and passes the same result to PitchLineup,
 * SubstitutionsPanel, and SubstitutePlayersPanel as props — no component
 * re-fetches or re-parses independently. MatchDetailHeader, MatchOverviewCard,
 * MatchCard, and MatchdayPreview do not read lineup/formation data at all
 * today (confirmed by grep, not assumed) — they only show the score and
 * crest via MatchSummary, so there was no duplicated fetch logic to
 * consolidate there.
 */

export interface FormationRow {
  label: string;
  players: LineupEntry[];
}

export interface TeamFormationResult {
  rows: FormationRow[];
  formation: string | null;
  /** Which real data this shape came from — never a guess presented as certainty. */
  source: "grid" | "position-fallback" | "even-split-fallback";
}

/**
 * API-Football's real per-player tactical slot for this match — "row:col"
 * (row 1 is always the goalkeeper; higher rows sit further upfield). Sent
 * straight through from the provider (see provider.ts's
 * ProviderLineupEntry.grid → match_lineups.grid), never guessed here.
 */
function parseGrid(grid: string | null): { row: number; col: number } | null {
  if (!grid) return null;
  const match = /^(\d+):(\d+)$/.exec(grid.trim());
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

/**
 * Groups a side's real starting XI by the provider's own grid row, which is
 * the most accurate shape this app can show — the exact slot API-Football
 * itself recorded, for *either* team (unlike `players.position`, which only
 * exists for Manchester United's own synced squad). Only trusted when
 * *every* starter has it: a partial grid would silently misplace whoever's
 * missing it, which is worse than falling back to the position-grouped
 * layout for the whole side. Returns null (never a guess) when the
 * provider didn't publish it — common for friendlies (confirmed: every
 * currently-synced friendly has null grid for both sides; every real
 * competitive fixture tested across Premier League, Europa League, FA Cup,
 * League Cup, and Community Shield had full grid coverage whenever a
 * lineup existed at all — see the phase report for the actual opponents
 * tested).
 */
function groupRowsFromGrid(starting: LineupEntry[]): FormationRow[] | null {
  if (starting.length === 0) return null;
  const parsed = starting.map((entry) => ({ entry, pos: parseGrid(entry.grid) }));
  if (parsed.some((p) => p.pos === null)) return null;

  const byRow = new Map<number, { entry: LineupEntry; col: number }[]>();
  for (const { entry, pos } of parsed) {
    const list = byRow.get(pos!.row) ?? [];
    list.push({ entry, col: pos!.col });
    byRow.set(pos!.row, list);
  }

  return [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, list], i) => ({
      label: i === 0 ? "GK" : `ROW_${rowNumber}`,
      players: list.sort((a, b) => a.col - b.col).map((x) => x.entry),
    }));
}

/**
 * Fallback for when the provider didn't publish a grid (see above) —
 * groups a side's real starting XI by their actual recorded `position`
 * (Goalkeeper/Defender/Midfielder/Attacker). Real data, real rows —
 * usable for *any* side, not just Manchester United's own squad: `players`
 * accumulates real, provider-sourced positions for opponents too now (see
 * sync.ts's resolvePlayerId, which backfills position for every new
 * player it ever creates, opponent or not), so this is no longer gated to
 * one team the way it originally was.
 */
function groupRowsByPosition(starting: LineupEntry[]): FormationRow[] {
  const byPosition = (pos: string) => starting.filter((e) => e.position === pos);
  const rows = [
    { label: "GK", players: byPosition("Goalkeeper") },
    { label: "DEF", players: byPosition("Defender") },
    { label: "MID", players: byPosition("Midfielder") },
    { label: "FWD", players: byPosition("Attacker") },
  ];

  const grouped = new Set(rows.flatMap((r) => r.players.map((p) => p.id)));
  let leftover = starting.filter((p) => !grouped.has(p.id));

  // Same real, near-universal convention groupRowsEvenly already trusts
  // for its own fallback: shirt #1 is (almost) always the goalkeeper. Only
  // applied when the real GK row came up empty (this side's actual keeper
  // is among the leftover/unclassified players) — without this, a keeper
  // missing just their `position` field would get appended into the
  // leftover row at the *end* of the array (see below), which layoutHalf
  // renders as the row closest to the halfway line — visibly wrong for a
  // goalkeeper specifically, not just "unclassified."
  const gkRow = rows[0];
  if (gkRow.players.length === 0) {
    const likelyKeeper = leftover.find((p) => p.shirtNumber === 1);
    if (likelyKeeper) {
      gkRow.players = [likelyKeeper];
      leftover = leftover.filter((p) => p.id !== likelyKeeper.id);
    }
  }

  // A real starter whose `players.position` is null (never part of a full
  // squad sync snapshot — e.g. a fringe/academy player who only ever
  // appears via this one match's lineup) previously vanished from the
  // pitch entirely: not matched by any of the four position filters above,
  // and silently dropped. They're real, they started, they're shown —
  // just in an extra row rather than a guessed position.
  if (leftover.length > 0) rows.push({ label: "XI", players: leftover });

  return rows.filter((row) => row.players.length > 0);
}

/** e.g. "4-3-3" derived straight from the real position/grid-grouped row sizes above — never a fabricated/guessed shape, just those same counts read out as a formation string. Excludes the goalkeeper row and the "XI" fallback row (an unknown-position player still shown on the pitch — see groupRowsByPosition — just not claimed as part of a clean tactical line). */
function formationFromRows(rows: FormationRow[]): string | null {
  const outfield = rows.filter((r) => r.label !== "GK" && r.label !== "XI");
  if (outfield.length === 0) return null;
  return outfield.map((r) => r.players.length).join("-");
}

/**
 * Fallback for when neither a grid nor `position` data exists for this side
 * (always true for the opponent, whose squad this app never syncs — see
 * sync.ts). Rather than guess a back-four/midfield-three shape this app
 * doesn't actually know, the side is shown as a neat, evenly-wrapped grid —
 * shirt number 1 pulled out front as keeper (a real, near-universal
 * convention, not a guess), everyone else in two plain rows, no tactical
 * label implied.
 */
function groupRowsEvenly(starting: LineupEntry[]): FormationRow[] {
  const keeper = starting.find((e) => e.shirtNumber === 1);
  const rest = starting.filter((e) => e !== keeper);
  const mid = Math.ceil(rest.length / 2);
  return [
    keeper ? { label: "GK", players: [keeper] } : null,
    rest.length > 0 ? { label: "XI", players: rest.slice(0, mid) } : null,
    rest.length > mid ? { label: "XI", players: rest.slice(mid) } : null,
  ].filter((row): row is FormationRow => row !== null && row.players.length > 0);
}

/**
 * Defensive cross-check: when the provider gives both a real formation
 * string and full grid data, the grid-derived outfield row sizes should
 * exactly match the formation string's own groups (e.g. "4-3-3" implies
 * row sizes [4,3,3]). Tested empirically against 9 real opponents across
 * 5 competitions this phase (Premier League, Europa League, FA Cup,
 * League Cup, Community Shield) and never once observed to disagree — but
 * if the provider ever does send inconsistent data for some opponent,
 * this logs a clear, specific warning (server-visible, same "log, don't
 * silently misclassify" convention as sync.ts's mapEventType) instead of
 * quietly rendering a shape that contradicts its own label with no trace
 * of why. The real grid shape still wins the render either way — it's the
 * more granular, per-player ground truth.
 */
function validateFormationAgainstGrid(formation: string | null, gridRows: FormationRow[] | null, teamLabel: string): void {
  if (!formation || !gridRows) return;
  const expectedGroups = formation.split("-").map(Number);
  if (expectedGroups.some((n) => !Number.isFinite(n) || n <= 0)) return;

  const actualGroups = gridRows.filter((r) => r.label !== "GK").map((r) => r.players.length);
  const isMatch = expectedGroups.length === actualGroups.length && expectedGroups.every((n, i) => n === actualGroups[i]);

  if (!isMatch) {
    console.warn(
      `[matches/lineups] ${teamLabel}: provider's formation string "${formation}" doesn't match its own grid-derived row sizes [${actualGroups.join("-")}]. Rendering the real grid shape, not the label's implied one — this is worth investigating against the raw provider response for this fixture.`,
    );
  }
}

/**
 * The single entry point every consumer should use to turn one side's raw
 * starting XI into a validated, honestly-sourced tactical shape. Tries the
 * provider's own real grid first (most accurate, works for either team);
 * falls back to real `position` data whenever there's *enough* of it to be
 * more informative than a shapeless split (see the threshold below) —
 * generic for both teams, not just Manchester United (see
 * groupRowsByPosition's doc comment: sync.ts now backfills position for
 * any newly-synced player, opponent included); otherwise an evenly-spread,
 * no-tactical-claim shape. Never fabricates a formation label for a shape
 * it can't actually back up with real data (see groupRowsEvenly's own doc
 * comment).
 */
export function buildTeamFormation({
  starting,
  realFormation,
  teamLabel,
}: {
  starting: LineupEntry[];
  /** The provider's own formation string for this team/match (`LineupEntry.formation`), if it published one. */
  realFormation: string | null;
  teamLabel: string;
}): TeamFormationResult {
  const gridRows = groupRowsFromGrid(starting);
  if (gridRows) {
    validateFormationAgainstGrid(realFormation, gridRows, teamLabel);
    return { rows: gridRows, formation: realFormation ?? formationFromRows(gridRows), source: "grid" };
  }

  const positionRows = groupRowsByPosition(starting);
  const classified = positionRows.filter((r) => r.label !== "XI").reduce((n, r) => n + r.players.length, 0);
  // Only trust the position-grouped shape once it actually classifies at
  // least half the real starting XI. Below that, most of the side would
  // land in one lumped "XI" catch-all row — less presentable, and no more
  // honest, than groupRowsEvenly's clean two-row spread. This is what lets
  // a side with real, mostly-complete backfilled data (e.g. 10 of 11
  // starters) render a genuine shape while a side that's still almost
  // entirely unbackfilled (e.g. 5 of 11) honestly degrades to the
  // shapeless fallback instead of a mostly-empty position grouping.
  if (starting.length > 0 && classified * 2 >= starting.length) {
    // A real bug, found via a real match (Man Utd vs West Ham): when one or
    // more starters have no synced `position` (a genuine squad-sync gap —
    // e.g. M. de Ligt, R. Højlund — not this function's problem to solve),
    // they land in the "XI" leftover row, which formationFromRows
    // deliberately excludes from its count. That's the right call for the
    // *shape* (never claim a tactical line for players we can't place), but
    // silently excluding those same players from the *label*'s count
    // previously produced a formation string that didn't add up to the
    // real starting XI (e.g. "3-3-2" for an 11-player side, quietly missing
    // 2 real starters) — confidently wrong, not just incomplete. Now: any
    // leftover row means no formation label at all for this side, rather
    // than a number that contradicts its own rendered grid.
    const hasLeftover = positionRows.some((r) => r.label === "XI");
    const formation = hasLeftover ? realFormation : (realFormation ?? formationFromRows(positionRows));
    return { rows: positionRows, formation, source: "position-fallback" };
  }

  const rows = groupRowsEvenly(starting);
  // Never synthesize a formation label from this shapeless fallback — only
  // the provider's own real string, if it gave one; these rows carry no
  // tactical meaning of their own.
  return { rows, formation: realFormation, source: "even-split-fallback" };
}
