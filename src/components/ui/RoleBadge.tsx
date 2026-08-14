"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRoleBadgesForProfile, type ProfileRoleBadge } from "@/lib/roles/badges";

export interface RoleBadgeProps {
  profileId: string;
  className?: string;
}

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-amber-400/90 text-amber-950",
  moderator: "border border-blue-500/30 bg-blue-500/15 text-blue-300",
  content_manager: "border border-purple-500/30 bg-purple-500/15 text-purple-300",
  match_manager: "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  award_manager: "border border-violet-500/30 bg-violet-500/15 text-violet-300",
};

/**
 * Self-fetching, like Sidebar/Navbar's own unread-count and role-flag
 * effects — this app's established pattern for "small piece of derived
 * data a component needs but its parent's own query doesn't already
 * carry", rather than threading role data through every feed/profile/
 * comment query's select shape. Renders nothing for the ~everyone who
 * holds no role (the common case) and nothing while loading, so it never
 * causes a layout shift/flash for the vast majority of authors.
 *
 * Only the highest-priority role is shown (see ROLE_PRIORITY in
 * lib/roles/badges.ts) — a name badge next to a post is not the place to
 * list every role someone holds.
 */
export function RoleBadge({ profileId, className = "" }: RoleBadgeProps) {
  const [badges, setBadges] = useState<ProfileRoleBadge[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    fetchRoleBadgesForProfile(supabase, profileId).then((result) => {
      if (active) setBadges(result);
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  const primary = badges[0];
  if (!primary) return null;

  const style = ROLE_STYLES[primary.roleKey] ?? "border border-ink/20 text-text-muted";

  return (
    <span
      title={primary.roleName}
      className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {primary.roleName}
    </span>
  );
}
