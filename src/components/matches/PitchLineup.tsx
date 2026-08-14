import { TeamCrest } from "@/components/media/TeamCrest";
import {
  YellowCardIcon,
  RedCardIcon,
  SecondYellowCardIcon,
  SoccerBallIcon,
  OwnGoalIcon,
  SubOffBadge,
} from "./MatchIcons";
import { formatEventMinute } from "@/lib/format";
import { buildTeamFormation, type FormationRow } from "@/lib/matches/lineups";
import type { LineupEntry, MatchEvent } from "@/lib/matches/matches";

export interface PitchLineupProps {
  entries: LineupEntry[];
  events: MatchEvent[];
  manUtdClubId: string;
  opponentName: string;
  /**
   * True when this match currently has zero lineup rows AND the page's own
   * sync attempt (see sync.ts's maybeSyncMatchLineups) just failed rather
   * than the provider genuinely never publishing one. Only meaningful when
   * `entries` is empty — changes which empty-state message renders below,
   * so a rate-limited fetch on an already-finished match doesn't read as
   * "check back before kickoff" (a real, previously-hidden bug: that
   * phrasing implied an upcoming match regardless of why the row count was
   * zero). Optional/defaulted so existing callers (and the temporary dev
   * regression harness) don't need to know about this.
   */
  lineupFetchFailed?: boolean;
}

type Row = FormationRow;

interface PlayerGoal {
  minute: number | null;
  minuteExtra: number | null;
  ownGoal: boolean;
}

interface PlayerBadges {
  card: "yellow" | "red" | "second_yellow" | null;
  goals: PlayerGoal[];
  subbedOffMinute: number | null;
}

/** `detail` is jsonb (`unknown`) — read defensively, same pattern as EventTimeline's readDetail. */
function readProviderDetail(detail: unknown): {
  text: string;
  minuteExtra: number | null;
} {
  if (typeof detail !== "object" || detail === null)
    return { text: "", minuteExtra: null };
  const d = detail as Record<string, unknown>;
  return {
    text: typeof d.provider_detail === "string" ? d.provider_detail : "",
    minuteExtra: typeof d.minute_extra === "number" ? d.minute_extra : null,
  };
}

/**
 * sync.ts's mapEventType already collapses a second-yellow dismissal into
 * the same `red_card` event_type as a straight red (both end a player's
 * match the same way) — but the provider's own original detail text
 * ("Second Yellow card" vs "Red Card") is still preserved verbatim in
 * `detail.provider_detail` (see EventTimeline's identical reading of this
 * field). Recovering the distinction here — for the badge only — reads
 * that real text back out rather than guessing; never invented when the
 * text doesn't say so.
 */
function cardFromEvent(
  providerDetailText: string,
): "yellow" | "red" | "second_yellow" {
  return providerDetailText.toLowerCase().includes("second yellow")
    ? "second_yellow"
    : "red";
}

/**
 * Real per-player match state (booked / scored / subbed off), derived from
 * this match's own already-synced events — never a second, invented data
 * source. Keyed by `players.id`, which both match_lineups and match_events
 * resolve to the same row for the same real person.
 *
 * A "Missed Penalty" is never counted as a goal here — sync.ts's
 * mapEventType now drops it entirely (a real, previously-uncaught bug: the
 * provider files it under the same `type: "Goal"` as an actual goal), so
 * it never reaches this function as an event_type: "goal" row in the
 * first place.
 */
function computeBadges(events: MatchEvent[]): Map<string, PlayerBadges> {
  const map = new Map<string, PlayerBadges>();
  const get = (id: string): PlayerBadges => {
    let entry = map.get(id);
    if (!entry) {
      entry = { card: null, goals: [], subbedOffMinute: null };
      map.set(id, entry);
    }
    return entry;
  };

  for (const event of events) {
    const playerId = event.player?.id;
    if (!playerId) continue;
    const { text: providerDetailText, minuteExtra } = readProviderDetail(
      event.detail,
    );

    if (event.eventType === "goal") {
      get(playerId).goals.push({
        minute: event.minute,
        minuteExtra,
        ownGoal: providerDetailText.toLowerCase().includes("own goal"),
      });
    } else if (event.eventType === "yellow_card") {
      get(playerId).card = "yellow";
    } else if (event.eventType === "red_card") {
      get(playerId).card = cardFromEvent(providerDetailText);
    } else if (event.eventType === "substitution") {
      get(playerId).subbedOffMinute = event.minute;
    }
  }

  return map;
}

interface PositionedPlayer {
  entry: LineupEntry;
  xPct: number;
  yPct: number;
}

// These three constants are what make the "no overlap into the opponent's
// half" guarantee structural rather than hopeful: every row's y-position is
// computed as a fraction of GOAL_LINE_PAD..(50-HALFWAY_PAD), which can never
// cross 50% no matter how many rows a formation has.
const GOAL_LINE_PAD = 10; // % of pitch height kept clear between the byline and the GK row
const HALFWAY_PAD = 6; // % of pitch height kept clear on each side of the halfway line
const SIDE_PAD = 8; // % of pitch width kept clear along each touchline, for this half's widest row

// The narrowest a multi-player row's own spread is ever allowed to shrink
// to, relative to the half's widest row — this is what keeps a 2-man
// central pairing clustered near the middle instead of stretched all the
// way to both touchlines, without hardcoding any specific formation.
const MIN_ROW_SPAN_FRACTION = 0.4;

/**
 * How wide (as a fraction of the widest row's own span) a row of `count`
 * players should occupy, relative to `maxCount` — the biggest row this
 * same half actually has. A back four/front three (near `maxCount`) gets
 * close to the full touchline-to-touchline width; a lone striker or a
 * central pair stays proportionally narrower and centred, the way a real
 * tactical shape actually reads — never a fixed edge-to-edge stretch
 * regardless of row size. Because this is purely a function of the row
 * counts already on the pitch, it re-shapes itself correctly for whatever
 * real formation the data represents, with nothing hardcoded per formation.
 */
function rowSpanFraction(count: number, maxCount: number): number {
  if (count <= 1 || maxCount <= 1) return 0;
  return (
    MIN_ROW_SPAN_FRACTION +
    (1 - MIN_ROW_SPAN_FRACTION) * ((count - 1) / (maxCount - 1))
  );
}

/**
 * Places one side's rows within their own half only — top half for
 * Manchester United (goal line at 0%, halfway at 50%), bottom half for the
 * opponent (goal line at 100%, halfway at 50%). Row *vertical* spacing is
 * purely a function of row count (see the pad constants above); row
 * *horizontal* spread is proportional to that row's own player count
 * against the half's widest row (see rowSpanFraction) and always centred —
 * so the shape adapts to whatever real formation the rows represent
 * instead of stretching every row to the same fixed width.
 */
function layoutHalf(rows: Row[], half: "top" | "bottom"): PositionedPlayer[] {
  const span = 50 - GOAL_LINE_PAD - HALFWAY_PAD;
  const maxCount = rows.reduce(
    (max, row) => Math.max(max, row.players.length),
    1,
  );
  const fullWidth = 100 - 2 * SIDE_PAD;
  const positioned: PositionedPlayer[] = [];

  rows.forEach((row, i) => {
    const t = rows.length > 1 ? i / (rows.length - 1) : 0.5;
    const yPct =
      half === "top"
        ? GOAL_LINE_PAD + t * span
        : 100 - GOAL_LINE_PAD - t * span;

    const rowWidth = rowSpanFraction(row.players.length, maxCount) * fullWidth;
    const rowLeft = 50 - rowWidth / 2;

    row.players.forEach((entry, k) => {
      const s = row.players.length > 1 ? k / (row.players.length - 1) : 0.5;
      const xPct = row.players.length > 1 ? rowLeft + s * rowWidth : 50;
      positioned.push({ entry, xPct, yPct });
    });
  });

  return positioned;
}

/**
 * Both teams render as plain number circles (no kit-color simulation) —
 * Manchester United crisp white (matching the reference design's own
 * lineup graphic convention), the opponent a muted dark translucent tone
 * so the pitch reads correctly as "us" vs "them" without guessing at
 * either side's actual kit colour for that specific match.
 */
/**
 * Fixed corner slots — this is the layering rule for every badge a chip
 * can carry (see the phase report for the full proposal): goal(s) top-
 * left, card top-right, substituted-off bottom-right, own-goal(s) bottom-
 * left. Each slot is independent, so a heavily-decorated player (scored,
 * booked, later subbed off) shows all three without any overlap — there's
 * no captain or injury marker in this app today (neither has a real data
 * source — see the phase report), so their slots stay reserved/empty
 * rather than repurposed.
 */
function PlayerChip({
  entry,
  tone,
  badges,
  approximate,
}: {
  entry: LineupEntry;
  tone: "manUtd" | "opponent";
  badges?: PlayerBadges;
  /**
   * True when this chip's position is the shapeless even-split fallback
   * (see lineups.ts's `source: "even-split-fallback"`) — neither the
   * provider's real grid nor real squad `position` data placed this
   * player, so the row/column is a neat but honestly-approximate spread,
   * not a real tactical read. Rendered visibly differently (dashed
   * border, reduced opacity) so it never reads as equally authoritative
   * as a grid- or position-derived chip.
   */
  approximate?: boolean;
}) {
  const normalGoals = badges?.goals.filter((g) => !g.ownGoal) ?? [];
  const ownGoals = badges?.goals.filter((g) => g.ownGoal) ?? [];
  const goalMinutes = (goals: PlayerGoal[]) =>
    goals.map((g) => formatEventMinute(g.minute, g.minuteExtra)).join(", ");

  return (
    <div
      className={`relative flex flex-col items-center gap-0.5 ${approximate ? "opacity-80" : ""}`}
      style={{ width: 42 }}
    >
      <div className="relative">
        {/* top-right: card */}
        {badges?.card ? (
          <span
            className="absolute -top-1 -right-1 z-10"
            title={
              badges.card === "second_yellow"
                ? "Second yellow card"
                : badges.card === "red"
                  ? "Red card"
                  : "Yellow card"
            }
          >
            {badges.card === "yellow" ? (
              <YellowCardIcon size={10} />
            ) : badges.card === "second_yellow" ? (
              <SecondYellowCardIcon size={10} />
            ) : (
              <RedCardIcon size={10} />
            )}
          </span>
        ) : null}

        <span
          title={approximate ? "Exact position not confirmed by the provider — shown as an even spread, not a real tactical read." : undefined}
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold shadow-[0_4px_10px_rgba(0,0,0,0.5)] ${
            approximate ? "border-dashed" : ""
          } ${
            tone === "manUtd"
              ? "border-black/10 bg-white text-[#151821]"
              : "border-white/25 bg-black/55 text-white backdrop-blur-[1px]"
          }`}
        >
          {entry.shirtNumber ?? "-"}
        </span>

        {/* top-left: goal(s) scored — never confusable with a card or the
            sub-off arrow (different icon, different corner). Sits mostly
            *over* the circle's own top-left rather than hovering above it
            (only a 1-2px peek) — a real bug (Man Utd vs West Ham, Bruno
            Fernandes' 2-goal badge) showed this floating detached into the
            row above when it protruded further up; anchoring it against
            the circle itself, not the empty space above it, is what
            actually fixes that regardless of how tight row spacing gets. */}
        {normalGoals.length > 0 ? (
          <span
            className="absolute -left-1 top-0 z-10 flex items-center gap-0.5 drop-shadow"
            title={`Scored: ${goalMinutes(normalGoals)}`}
          >
            <SoccerBallIcon size={11} />
            {normalGoals.length > 1 ? (
              <span className="text-[7.5px] font-extrabold text-white [text-shadow:0_1px_1.5px_rgba(0,0,0,0.9)]">
                ×{normalGoals.length}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* bottom-left: own goal(s) — a distinct red-backed icon, since it's the wrong team's tally, not a normal goal */}
        {ownGoals.length > 0 ? (
          <span
            className="absolute -bottom-0.5 -left-1.5 z-10 flex items-center gap-0.5 drop-shadow"
            title={`Own goal: ${goalMinutes(ownGoals)}`}
          >
            <OwnGoalIcon size={12} />
            {ownGoals.length > 1 ? (
              <span className="text-[8px] font-extrabold text-white [text-shadow:0_1px_1.5px_rgba(0,0,0,0.9)]">
                ×{ownGoals.length}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* bottom-right: substituted off */}
        {badges?.subbedOffMinute != null ? (
          <span
            className="absolute -bottom-0.5 -right-0.5"
            title={`Substituted off, ${formatEventMinute(badges.subbedOffMinute)}`}
          >
            <SubOffBadge size={12} />
          </span>
        ) : null}
      </div>
      {/* Real name as the provider gives it, in full — wraps to a second
          line instead of hard-truncating with an ellipsis. Two real
          examples this was checked against: "A. Wan-Bissaka" (wraps
          cleanly at the hyphen) and "Bruno Fernandes"/"Matheus Cunha"
          (some providers give the full first name, not an initial — never
          shortened further by this app).

          text-white, not text-ink: the pitch itself is a fixed green
          gradient (see the container's own `background` below), never
          themed — light mode flips --color-ink toward near-black, which
          against this permanently-dark grass read as barely-there text (the
          reported bug). Same reasoning as every other label on this pitch
          (shirt numbers, formation badges below). */}
      <span className="line-clamp-2 max-w-[54px] text-center text-[7.5px] font-semibold leading-[1.15] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        {entry.playerName}
      </span>
    </div>
  );
}

/**
 * Regulation-proportioned pitch markings (real FIFA ratios scaled to this
 * 400×600 viewBox — never arbitrary shapes): both penalty areas, both
 * 6-yard boxes, penalty spots and arcs, the centre circle, and corner
 * arcs. Each end's penalty arc is the real "D" — only the portion of the
 * arc outside its own box.
 */
function PitchMarkings() {
  const line = {
    stroke: "white",
    strokeOpacity: 0.55,
    strokeWidth: 2,
    fill: "none",
  } as const;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 600"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="388" height="588" {...line} />
      <line x1="6" y1="300" x2="394" y2="300" {...line} />
      <circle cx="200" cy="300" r="52" {...line} />
      <circle cx="200" cy="300" r="2.5" fill="white" fillOpacity="0.55" />

      {/* top (Manchester United) box */}
      <rect x="85" y="6" width="230" height="92" {...line} />
      <rect x="148" y="6" width="104" height="31" {...line} />
      <circle cx="200" cy="68" r="1.6" fill="white" fillOpacity="0.55" />
      <path d="M 157.5 98 A 52 52 0 0 1 242.5 98" {...line} />

      {/* bottom (opponent) box */}
      <rect x="85" y="502" width="230" height="92" {...line} />
      <rect x="148" y="563" width="104" height="31" {...line} />
      <circle cx="200" cy="532" r="1.6" fill="white" fillOpacity="0.55" />
      <path d="M 157.5 502 A 52 52 0 0 0 242.5 502" {...line} />

      {/* corner arcs */}
      <path d="M 6 18 A 12 12 0 0 0 18 6" {...line} />
      <path d="M 382 6 A 12 12 0 0 0 394 18" {...line} />
      <path d="M 394 582 A 12 12 0 0 0 382 594" {...line} />
      <path d="M 18 594 A 12 12 0 0 0 6 582" {...line} />
    </svg>
  );
}

/**
 * Player ids within `rows` that don't carry a real, provider-confirmed
 * placement:
 * - `even-split-fallback` — the whole side is the shapeless spread (neither
 *   grid nor enough real position data), so every chip on it is approximate.
 * - `position-fallback` — only the "XI" leftover row is approximate (real
 *   starters whose `players.position` still isn't synced — see
 *   groupRowsByPosition); their teammates in the same result sit in real
 *   GK/DEF/MID/FWD rows and render normally right next to them.
 * - `grid` — nothing is approximate; the provider's own per-player slot.
 * Kept separate from PlayerChip so only the honestly-uncertain chips get
 * the dashed/dimmed treatment, never a whole side just because one or two
 * of its players are still missing real position data.
 */
function approximatePlayerIds(rows: Row[], source: string): Set<string> {
  if (source === "even-split-fallback") {
    return new Set(rows.flatMap((r) => r.players.map((p) => p.id)));
  }
  if (source === "position-fallback") {
    return new Set(
      rows
        .filter((r) => r.label === "XI")
        .flatMap((r) => r.players.map((p) => p.id)),
    );
  }
  return new Set();
}

/**
 * A real-11-vs-real-11 pitch view: Manchester United's actual synced
 * starting XI at the top attacking down, the opponent's actual starting XI
 * at the bottom attacking up, both from API-Football's lineups endpoint
 * (see migration add_match_lineups) — never fabricated placeholder names
 * or invented formations. Every chip's row/column is either the
 * provider's own real per-player grid slot (see lineups.ts's
 * buildTeamFormation) or, when the provider hasn't published one, an
 * honest position/evenly-spread fallback — but either way it's laid out
 * by `layoutHalf` inside a
 * strictly bounded half of the pitch, so a side can never visually spill
 * across the halfway line regardless of how many rows its formation needs.
 * Card/goal/substitution badges on each chip come from this same match's
 * own already-synced match_events (see computeBadges) — real events, not a
 * second guess at what happened.
 */
export function PitchLineup({
  entries,
  events,
  manUtdClubId,
  opponentName,
  lineupFetchFailed,
}: PitchLineupProps) {
  const manUtd = entries.filter((e) => e.clubId === manUtdClubId);
  const opponent = entries.filter((e) => e.clubId !== manUtdClubId);

  const manUtdStarting = manUtd.filter((e) => e.isStarting);
  const opponentStarting = opponent.filter((e) => e.isStarting);
  const opponentExternalRef =
    opponent.find((e) => e.clubExternalRef)?.clubExternalRef ?? null;

  if (manUtdStarting.length === 0 && opponentStarting.length === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-bg-surface p-8 text-center text-sm text-text-muted">
        {lineupFetchFailed ? (
          <>
            We couldn&apos;t fetch this match&apos;s lineup just now — the
            data provider is temporarily unavailable (usually a request
            limit resetting on its own). This isn&apos;t missing data on
            our end; refresh in a bit and it should appear.
          </>
        ) : (
          <>
            The lineup isn&apos;t published yet — it usually lands shortly
            before kickoff.
          </>
        )}
      </div>
    );
  }

  // Both sides go through the exact same shared, validated pipeline (see
  // lineups.ts) — never two different ad hoc code paths for "us" vs
  // "them". Only the fallback source differs (Man Utd's own synced squad
  // has real `position` data to fall back to; an opponent's never does).
  const {
    rows: manUtdRows,
    formation,
    source: manUtdSource,
  } = buildTeamFormation({
    starting: manUtdStarting,
    realFormation: manUtd.find((e) => e.formation)?.formation ?? null,
    teamLabel: "Manchester United",
  });
  const {
    rows: opponentRows,
    formation: opponentFormation,
    source: opponentSource,
  } = buildTeamFormation({
    starting: opponentStarting,
    realFormation: opponent.find((e) => e.formation)?.formation ?? null,
    teamLabel: opponentName,
  });

  const manUtdApproxIds = approximatePlayerIds(manUtdRows, manUtdSource);
  const opponentApproxIds = approximatePlayerIds(opponentRows, opponentSource);
  const hasApproximate = manUtdApproxIds.size > 0 || opponentApproxIds.size > 0;

  const badgeMap = computeBadges(events);
  const manUtdChips = layoutHalf(manUtdRows, "top");
  const opponentChips = layoutHalf(opponentRows, "bottom");

  // A real bug (Man Utd vs West Ham): the pitch's height came purely from
  // a fixed aspect-ratio, so a side with 5 rows (e.g. a position-fallback
  // leftover row on top of GK/DEF/MID/FWD) got the exact same vertical
  // space as a normal 4-row side — every row packed proportionally
  // tighter, and a goal badge (which has a fixed pixel size, not a
  // percentage one) could visually collide with the row directly above
  // it. This never showed up in synthetic formation testing because that
  // fixture data carried no events/badges at all. Fix: once either side
  // needs more than 4 rows, grow the pitch's minimum height so every row
  // keeps the same real pixel breathing room regardless of row count —
  // width/proportions are untouched, only height floors higher.
  const maxRowCount = Math.max(manUtdRows.length, opponentRows.length);
  // Wide enough to clear a two-line wrapped name (see PlayerChip — Bug 2's
  // fix) sitting directly above a goal badge's own protrusion on the row
  // below it — checked against the real Man Utd vs West Ham case, which
  // has both a 5th leftover row and a two-goal badge on the same side.
  const EXTRA_ROW_HEIGHT_PX = 96;
  const extraHeightPx = Math.max(0, maxRowCount - 4) * EXTRA_ROW_HEIGHT_PX;

  return (
    <div className="flex flex-col gap-2">
      {hasApproximate ? (
        <div
          role="status"
          className="mx-auto flex w-full max-w-[340px] items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100"
        >
          <span aria-hidden="true" className="mt-px text-sm leading-none">
            ⚠
          </span>
          <p className="leading-snug">
            <span className="font-semibold">Partial lineup — not a bug.</span>{" "}
            The provider hasn&apos;t confirmed exact positions for every
            player yet. Dashed, dimmer players below are shown at an even
            spread, not their real tactical spot.
          </p>
        </div>
      ) : null}
      {/* border-white/10, not border-ink/10: this pitch's own background
          (below) is a fixed green gradient, not a theme-reactive surface —
          same reasoning as every label pinned to text-white inside it. */}
      <div
        className="relative mx-auto aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-card border border-white/10 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.7)] sm:max-w-[340px]"
        style={{
          background:
            "repeating-linear-gradient(180deg, #1c6b3a 0 40px, #1a6236 40px 80px), radial-gradient(120% 70% at 50% 8%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%)",
          minHeight: extraHeightPx > 0 ? 450 + extraHeightPx : undefined,
        }}
      >
        <PitchMarkings />

        {/* Watermarks — the real Man Utd emblem on our own half; the
          opponent's real crest (hotlinked live from API-Football's CDN —
          see TeamCrest) on theirs when its provider team id is known, else
          its name set large and faint. Never a fabricated crest. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 opacity-[0.1]"
          aria-hidden="true"
        >
          <TeamCrest variant="manUtd" name="Manchester United" size={140} />
        </div>
        {opponentExternalRef ? (
          <div
            className="pointer-events-none absolute left-1/2 top-3/4 -translate-x-1/2 -translate-y-1/2 opacity-[0.1]"
            aria-hidden="true"
          >
            <TeamCrest
              variant="opponent"
              externalRef={opponentExternalRef}
              name={opponentName}
              size={140}
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 top-3/4 flex -translate-y-1/2 items-center justify-center overflow-hidden opacity-[0.09]"
            aria-hidden="true"
          >
            <span className="font-display whitespace-nowrap text-3xl font-bold uppercase text-white sm:text-4xl">
              {opponentName}
            </span>
          </div>
        )}

        {/* Corner badges — crest + real formation, floating directly on the
          grass (no chrome bars), matching the reference design exactly. */}
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
          <TeamCrest
            variant="manUtd"
            name="Manchester United"
            size={24}
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          />
          {/* text-white, not text-ink: this chip's own background is a fixed
              bg-black/70, not a theme-reactive surface, so its label needs
              to stay literal white too — light mode's near-black --color-ink
              against this permanently-dark chip was the reported "formation
              not clear" bug. */}
          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
            {formation ?? "—"}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 z-10 flex flex-col items-end gap-1 sm:bottom-3 sm:right-3">
          <TeamCrest
            variant="opponent"
            externalRef={opponentExternalRef}
            name={opponentName}
            size={24}
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          />
          <span
            className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm"
            title={opponentSource === "even-split-fallback" ? "Exact positions not confirmed by the provider for this side" : undefined}
          >
            {opponentFormation ?? "—"}
            {opponentSource === "even-split-fallback" ? <span className="ml-0.5 font-normal text-white/60">~</span> : null}
          </span>
        </div>

        {manUtdChips.map(({ entry, xPct, yPct }) => (
          <div
            key={entry.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            <PlayerChip
              entry={entry}
              tone="manUtd"
              badges={entry.playerId ? badgeMap.get(entry.playerId) : undefined}
              approximate={manUtdApproxIds.has(entry.id)}
            />
          </div>
        ))}
        {opponentChips.map(({ entry, xPct, yPct }) => (
          <div
            key={entry.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            <PlayerChip
              entry={entry}
              tone="opponent"
              badges={entry.playerId ? badgeMap.get(entry.playerId) : undefined}
              approximate={opponentApproxIds.has(entry.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
