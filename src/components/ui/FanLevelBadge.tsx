import { Badge } from "./Badge";

export interface FanLevelBadgeProps {
  level: number;
  className?: string;
}

/**
 * The "Level N" pill was hand-copied with the exact same classes in
 * PostCard/MemberCard/LeaderboardRow, and re-copied *incorrectly* in
 * CommentItem (which said "Lvl N" instead of "Level N") — a real, visible
 * inconsistency the Phase 15 audit found. One component now, everywhere.
 */
export function FanLevelBadge({ level, className = "" }: FanLevelBadgeProps) {
  return (
    <Badge tone="outline" className={`!px-1.5 !py-0 text-[10px] ${className}`}>
      Level {level}
    </Badge>
  );
}
