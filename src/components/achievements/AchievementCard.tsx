import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BADGE_ICONS, BADGE_COLORS, ShieldCheckIcon } from "./AchievementIcons";
import type { BadgeStatus } from "@/lib/achievements/achievements";

export interface AchievementCardProps {
  badgeKey: string;
  name: string;
  description: string | null;
  status: BadgeStatus;
}

const RING_SIZE = 88;
const RING_STROKE = 4.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * One badge tile — a real medallion, not a flat icon-in-a-circle. A
 * fan-facing "you're this close" needs to actually look like progress, not
 * just say it in a caption underneath: the ring around the medal is a real
 * SVG arc driven by status.current/threshold (0% for not-tracked, a
 * genuine fraction for in-progress, a complete gold ring for earned) —
 * never decorative, never a fixed "looks impressive" arc unrelated to the
 * real number in the pill below it.
 *
 * Earned vs. not-earned reads as two different objects, not just a color
 * swap: earned gets the badge's full color as a solid medallion face, a
 * diagonal shine sweep, a small corner star, and a soft glow; in-progress/
 * not-tracked gets a hollow outlined medallion in the same hue at low
 * strength, so it's recognizably "the same badge, not unlocked yet" rather
 * than a generic locked padlock (this app never fabricates a "locked"
 * state implying a fan didn't try hard enough when a criteria type simply
 * isn't tracked yet — see evaluateBadge).
 */
export function AchievementCard({ badgeKey, name, description, status }: AchievementCardProps) {
  const Icon = BADGE_ICONS[badgeKey] ?? ShieldCheckIcon;
  const color = BADGE_COLORS[badgeKey] ?? "#e3382b";
  const earned = status.state === "earned";
  const notTracked = status.state === "not-tracked";

  const progress = earned ? 1 : status.state === "in-progress" ? Math.min(1, status.current / Math.max(1, status.threshold)) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <Card
      className={`relative flex flex-col items-center gap-3 overflow-hidden text-center ${notTracked ? "opacity-60" : ""}`}
      style={earned ? { borderColor: `${color}80`, boxShadow: `0 0 0 1px ${color}40, 0 16px 32px -20px ${color}80` } : undefined}
    >
      {earned ? (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${color}26, transparent 65%)` }}
        />
      ) : null}

      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
          {/* Track — always visible, a faint hint of the full circle the medal is filling toward. */}
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={`${color}1f`} strokeWidth={RING_STROKE} />
          {/* Progress — a real arc, not decoration; see this component's own doc comment. */}
          {progress > 0 ? (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          ) : null}
        </svg>

        {/* The medallion face itself, inset from the ring. */}
        <span
          className={`absolute inset-[9px] flex items-center justify-center overflow-hidden rounded-full ${earned ? "" : "border-2 border-dashed"}`}
          style={
            earned
              ? { backgroundImage: `radial-gradient(circle at 35% 25%, ${color}, ${color}cc 70%)`, color: "#140a02" }
              : { borderColor: `${color}55`, backgroundColor: `${color}14`, color }
          }
        >
          {earned ? (
            // Diagonal shine sweep — a medal catching light, purely decorative.
            <span
              className="pointer-events-none absolute -inset-y-4 -left-1/2 w-1/3 rotate-[20deg] bg-white/35"
              aria-hidden="true"
            />
          ) : null}
          <Icon size={26} />
        </span>

        {earned ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm"
            style={{ backgroundColor: color, color: "#140a02" }}
            aria-hidden="true"
          >
            ★
          </span>
        ) : null}
      </div>

      <div className="relative">
        <p className="font-display text-sm font-bold uppercase text-ink">{name}</p>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </div>
      <div className="relative">
        {earned ? (
          <Badge tone="red" style={{ backgroundColor: color, color: "#140a02" }}>
            Earned
          </Badge>
        ) : notTracked ? (
          <Badge tone="outline">Tracking coming soon</Badge>
        ) : (
          <Badge tone="outline">
            {status.current} / {status.threshold}
          </Badge>
        )}
      </div>
    </Card>
  );
}
