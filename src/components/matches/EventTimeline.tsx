import { Avatar } from "@/components/ui/Avatar";
import { SoccerBallIcon, YellowCardIcon, RedCardIcon, SubstitutionIcon, VarIcon } from "./MatchIcons";
import { formatEventMinute } from "@/lib/format";
import type { MatchEvent } from "@/lib/matches/matches";

export interface EventTimelineProps {
  events: MatchEvent[];
}

interface SyncedEventDetail {
  provider_detail?: string;
  comments?: string | null;
  assist_player_name?: string | null;
  minute_extra?: number | null;
}

/** `detail` is jsonb (`unknown` in our types) — this never trusts its shape, since it's third-party data passed through from the sync process. */
function readDetail(detail: unknown): SyncedEventDetail {
  if (typeof detail !== "object" || detail === null) return {};
  const d = detail as Record<string, unknown>;
  return {
    provider_detail: typeof d.provider_detail === "string" ? d.provider_detail : undefined,
    comments: typeof d.comments === "string" ? d.comments : null,
    assist_player_name: typeof d.assist_player_name === "string" ? d.assist_player_name : null,
    minute_extra: typeof d.minute_extra === "number" ? d.minute_extra : null,
  };
}

function eventIcon(eventType: string) {
  switch (eventType) {
    case "goal":
      // A real ball graphic (pentagon seams), not a plain dot — a goal
      // deserves to actually read as a goal at a glance in the timeline.
      return <SoccerBallIcon size={16} />;
    case "yellow_card":
      return <YellowCardIcon />;
    case "red_card":
      return <RedCardIcon />;
    case "substitution":
      return <SubstitutionIcon />;
    case "var":
      return <VarIcon />;
    default:
      return null;
  }
}

/**
 * `detail.assist_player_name` means something different depending on
 * event type: for a goal it's a real assist; for a substitution,
 * API-Football puts the incoming player in that same field, which is not
 * a football "assist" and was previously mislabeled as one. Yellow/red
 * cards and VAR reviews don't have a meaningful use for this field at
 * all, so it's never shown for them (preserving their existing
 * presentation exactly).
 */
function secondaryDetailLine(eventType: string, detail: SyncedEventDetail): string | null {
  if (!detail.assist_player_name) return null;
  if (eventType === "goal") return `Assist: ${detail.assist_player_name}`;
  if (eventType === "substitution") return `${detail.assist_player_name} on`;
  return null;
}

function eventLabel(eventType: string, detail: SyncedEventDetail): string {
  switch (eventType) {
    case "goal":
      return detail.provider_detail && detail.provider_detail !== "Normal Goal" ? detail.provider_detail : "Goal";
    case "yellow_card":
      return "Yellow card";
    case "red_card":
      return "Red card";
    case "substitution":
      return "Substitution";
    case "var":
      return detail.provider_detail || "VAR review";
    default:
      return eventType;
  }
}

function minuteValue(event: MatchEvent): number {
  return event.minute ?? Number.POSITIVE_INFINITY;
}

/** One compact row — everything on (at most) two lines instead of the previous icon+avatar+label+name+detail stack, so a full 20-event match fits in far less scroll. */
function EventRow({ event }: { event: MatchEvent }) {
  const detail = readDetail(event.detail);
  const playerName = event.player?.fullName ?? null;
  const secondaryLine = secondaryDetailLine(event.eventType, detail);

  return (
    <li className="flex items-center gap-2.5 rounded-control border border-white/10 bg-bg-surface px-3 py-2">
      <span className="flex h-6 w-11 shrink-0 items-center justify-center rounded bg-bg-elevated text-[11px] font-semibold tabular-nums text-text-muted">
        {formatEventMinute(event.minute, detail.minute_extra)}
      </span>
      <span className="shrink-0 text-text-muted" aria-hidden="true">
        {eventIcon(event.eventType)}
      </span>
      {playerName ? <Avatar url={null} name={playerName} size={20} /> : null}
      <div className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-white">{playerName ?? eventLabel(event.eventType, detail)}</span>
        {playerName ? <span className="text-text-muted"> — {eventLabel(event.eventType, detail)}</span> : null}
        {secondaryLine ? <span className="text-text-muted"> · {secondaryLine}</span> : null}
      </div>
    </li>
  );
}

/** Groups by half so a long event list reads as two shorter scannable blocks (1st Half / 2nd Half+) instead of one long undifferentiated column — real minute data, no invented half boundary beyond the standard 45. */
function groupByHalf(events: MatchEvent[]): { label: string; events: MatchEvent[] }[] {
  const sorted = [...events].sort((a, b) => minuteValue(a) - minuteValue(b));
  const first = sorted.filter((e) => minuteValue(e) <= 45);
  const second = sorted.filter((e) => minuteValue(e) > 45);
  return [
    { label: "1st Half", events: first },
    { label: "2nd Half", events: second },
  ].filter((group) => group.events.length > 0);
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-card border border-white/10 bg-bg-surface p-8 text-center text-sm text-text-muted">
        No match events yet.
      </div>
    );
  }

  const groups = groupByHalf(events);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
          <ol className="flex flex-col gap-1.5">
            {group.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
