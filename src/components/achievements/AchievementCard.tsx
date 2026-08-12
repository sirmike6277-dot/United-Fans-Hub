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

/**
 * One badge tile — icon, name, and a caption that's always the real
 * evaluated state (see evaluateBadge): "Earned", "X of Y" progress, or
 * "Tracking coming soon" for the two criteria types this app doesn't
 * measure anywhere yet. Never a fabricated "locked" padlock implying a
 * fan simply hasn't tried hard enough when the truth is the feature isn't
 * built.
 *
 * Each badge carries its own colour (see BADGE_COLORS) rather than one
 * uniform gold for everything earned — full strength + a glowing border
 * when earned, the same colour at low strength (still visibly "this
 * badge's colour", just dormant) when it isn't yet.
 */
export function AchievementCard({ badgeKey, name, description, status }: AchievementCardProps) {
  const Icon = BADGE_ICONS[badgeKey] ?? ShieldCheckIcon;
  const color = BADGE_COLORS[badgeKey] ?? "#e3382b";
  const earned = status.state === "earned";
  const notTracked = status.state === "not-tracked";

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

      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: earned ? `${color}26` : `${color}14`,
          color,
        }}
      >
        <Icon size={26} />
      </span>
      <div className="relative">
        <p className="font-display text-sm font-bold uppercase text-white">{name}</p>
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
