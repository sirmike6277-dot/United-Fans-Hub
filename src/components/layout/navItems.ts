import type { ComponentType } from "react";
import { HomeIcon, CommunityIcon, MatchCentreIcon, ProfileIcon, GearIcon } from "./ShellIcons";
import { UsersIcon } from "@/components/members/MembersIcons";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import { MessageBubbleIcon } from "@/components/messaging/MessagingIcons";
import { BellIcon } from "@/components/notifications/NotificationIcons";
import { StarShieldIcon, CrownIcon } from "@/components/achievements/AchievementIcons";
import { ShieldIcon } from "@/components/community/RoomIcons";
import { InboxIcon } from "@/components/moderation/ModerationIcons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** Key into an unread-counts map (fetched independently by whichever component renders this list) — omitted for items with no badge. */
  countKey?: "messages" | "notifications";
}

/**
 * The single, authoritative list of the signed-in app's main sections —
 * previously duplicated between Sidebar.tsx (the real, complete list) and
 * Navbar.tsx's mobile signed-in menu (a separate, hand-picked, silently
 * incomplete subset that never got Community, Match Centre, Achievements,
 * or Settings added when they shipped). That's exactly the bug this fixes:
 * on any viewport narrower than the `lg` breakpoint, Sidebar renders
 * nothing at all (`hidden lg:block`), so Navbar's mobile menu was a
 * visitor's *only* way to reach those sections on mobile — and it simply
 * didn't list them. Both Sidebar and Navbar now render from this one
 * array, so they can't drift apart again.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/community", label: "Community", icon: CommunityIcon },
  { href: "/community/rooms", label: "Fan Rooms", icon: MessageBubbleIcon },
  { href: "/matches", label: "Match Centre", icon: MatchCentreIcon },
  { href: "/predictions", label: "Predictions", icon: TrophyIcon },
  { href: "/members", label: "Members", icon: UsersIcon },
  { href: "/achievements", label: "Achievements", icon: StarShieldIcon },
  { href: "/awards", label: "Awards", icon: CrownIcon },
  { href: "/messages", label: "Messages", icon: MessageBubbleIcon, countKey: "messages" },
  { href: "/notifications", label: "Notifications", icon: BellIcon, countKey: "notifications" },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

/** Shown only to a moderator/super_admin — role-gated by whichever component renders it, same real `has_role` RPC check both Sidebar and Navbar make. */
export const MODERATION_NAV_ITEM: NavItem = { href: "/moderation", label: "Moderation", icon: InboxIcon };
/** Shown only to a super_admin. */
export const ADMIN_NAV_ITEM: NavItem = { href: "/admin", label: "Admin", icon: ShieldIcon };
