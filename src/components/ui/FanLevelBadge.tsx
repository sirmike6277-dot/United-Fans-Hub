export interface FanLevelBadgeProps {
  level: number;
  /** "sm" (default) matches every inline caller (posts, comments, messages, member/nominee cards); "lg" is just the profile page's own header row, which sits among full-size Badge pills (points, rank, crown). */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * One entry per real `fan_levels` row (level, title, star colour) — kept
 * here rather than fetched per-caller because every existing caller
 * (PostCard/CommentItem/MessageBubble/MemberCard/NomineeVoteCard) already
 * has the numeric fan_level on hand and nothing else; requiring each of
 * them to also fetch/join the title would touch five unrelated queries
 * for a lookup table that's effectively static seed data (migration
 * 031/048). If `fan_levels.title` is ever edited in the database, update
 * the titles below to match - there is currently no admin UI that could
 * change them out from under this file silently.
 *
 * Colour escalates once per level (not just once per few levels) and
 * stays inside the app's own red/gold/neutral palette rather than
 * introducing new hues - Icon (7) gets the one gradient treatment as the
 * rarest tier. Deliberately never purple - that's reserved for the Fan of
 * the Season crown (see Avatar.tsx) and reusing it here would blur two
 * unrelated signals together.
 */
const LEVEL_META: Record<number, { title: string; fill: string; stroke: string }> = {
  1: { title: "Fan", fill: "#8a8a90", stroke: "#5a5a5f" },
  2: { title: "Regular", fill: "#a8895a", stroke: "#6b5637" },
  3: { title: "Supporter", fill: "#c17a4a", stroke: "#7a4a26" },
  4: { title: "Loyal Fan", fill: "#da291c", stroke: "#8a2a20" },
  5: { title: "Superfan", fill: "#b8202f", stroke: "#6e1420" },
  6: { title: "Legend", fill: "#f2c14e", stroke: "#8b5e00" },
  7: { title: "Icon", fill: "url(#levelGradIcon)", stroke: "#7a4a00" },
};
const HIGHEST_META = LEVEL_META[7];

function metaFor(level: number) {
  return LEVEL_META[level] ?? (level > 7 ? HIGHEST_META : LEVEL_META[1]);
}

function StarIcon({ level, size }: { level: number; size: number }) {
  const meta = metaFor(level);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={meta.fill} stroke={meta.stroke} strokeWidth={1} strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {meta.fill.startsWith("url(") ? (
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

/**
 * The "Level N" pill was hand-copied with the exact same classes in
 * PostCard/MemberCard/LeaderboardRow, and re-copied *incorrectly* in
 * CommentItem (which said "Lvl N" instead of "Level N") — a real, visible
 * inconsistency the Phase 15 audit found. One component now, everywhere.
 *
 * Shows a coloured star + the level's real title (e.g. "Superfan") — not
 * the raw number, which read as a bare stat rather than an actual named
 * rank. Every caller just passes the numeric fan_level it already has;
 * this resolves both the colour and the title from that alone.
 */
export function FanLevelBadge({ level, size = "sm", className = "" }: FanLevelBadgeProps) {
  const meta = metaFor(level);
  const sizeClasses = size === "lg" ? "gap-1.5 px-3 py-1 text-xs" : "gap-1 px-1.5 py-0 text-[10px]";
  return (
    <span
      title={`Fan Level ${level} — ${meta.title}`}
      className={`inline-flex items-center rounded-full border bg-bg-elevated font-semibold uppercase tracking-wide text-text-muted ${sizeClasses} ${className}`}
      style={{ borderColor: `${meta.stroke}66` }}
    >
      <StarIcon level={level} size={size === "lg" ? 14 : 11} />
      {meta.title}
    </span>
  );
}
