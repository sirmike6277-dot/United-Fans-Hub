export interface FanLevelBadgeProps {
  level: number;
  /** Shown only when passed (the profile page's own richer badge) — every other caller (posts, comments, messages, member cards, nominee cards) stays compact with just the star + number. */
  title?: string;
  /** "sm" (default) matches every inline caller; "lg" is just the profile page's own header row, which sits among full-size Badge pills (points, rank, crown). */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * The "Level N" pill was hand-copied with the exact same classes in
 * PostCard/MemberCard/LeaderboardRow, and re-copied *incorrectly* in
 * CommentItem (which said "Lvl N" instead of "Level N") — a real, visible
 * inconsistency the Phase 15 audit found. One component now, everywhere.
 *
 * Star + colour now escalate across four tiers of the real fan_levels
 * ladder (1-7: Fan → Regular → Supporter → Loyal Fan → Superfan → Legend →
 * Icon), so the badge itself signals standing at a glance next to a
 * username wherever someone posts, comments, or messages — not just a
 * plain outline pill with a number. Deliberately red/gold, not purple —
 * purple is reserved for the Fan of the Season crown (see Avatar.tsx) and
 * reusing it here would blur two unrelated signals together.
 */
function tierFor(level: number): { stroke: string; fill: string; border: string } {
  if (level >= 7) return { stroke: "#7a4a00", fill: "url(#levelGradIcon)", border: "border-[#f2c14e]/50" };
  if (level >= 5) return { stroke: "#8b5e00", fill: "#f2c14e", border: "border-[#f2c14e]/40" };
  if (level >= 3) return { stroke: "#8a2a20", fill: "#da291c", border: "border-red-primary/30" };
  return { stroke: "#5a5a5f", fill: "#9a9aa0", border: "border-ink/15" };
}

function StarIcon({ level, size }: { level: number; size: number }) {
  const tier = tierFor(level);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={tier.fill} stroke={tier.stroke} strokeWidth={1} strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {level >= 7 ? (
        <defs>
          <linearGradient id="levelGradIcon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde08a" />
            <stop offset="100%" stopColor="#da291c" />
          </linearGradient>
        </defs>
      ) : null}
      <path d="M12 2.5l2.7 6.2 6.6.6-5 4.5 1.5 6.6-5.8-3.6-5.8 3.6 1.5-6.6-5-4.5 6.6-.6L12 2.5Z" />
    </svg>
  );
}

export function FanLevelBadge({ level, title, size = "sm", className = "" }: FanLevelBadgeProps) {
  const tier = tierFor(level);
  const sizeClasses = size === "lg" ? "gap-1.5 px-3 py-1 text-xs" : "gap-1 px-1.5 py-0 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full border ${tier.border} bg-bg-elevated font-semibold uppercase tracking-wide text-text-muted ${sizeClasses} ${className}`}
    >
      <StarIcon level={level} size={size === "lg" ? 14 : 11} />
      {title ? `Lv.${level} ${title}` : `Level ${level}`}
    </span>
  );
}
