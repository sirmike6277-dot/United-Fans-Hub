"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchUnreadCount } from "@/lib/notifications/notifications";
import { fetchUnreadConversationCount } from "@/lib/messaging/conversations";
import { HomeIcon, CommunityIcon, MatchCentreIcon, ProfileIcon, GearIcon } from "./ShellIcons";
import { UsersIcon } from "@/components/members/MembersIcons";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import { MessageBubbleIcon } from "@/components/messaging/MessagingIcons";
import { BellIcon } from "@/components/notifications/NotificationIcons";
import { StarShieldIcon } from "@/components/achievements/AchievementIcons";
import { ShieldIcon } from "@/components/community/RoomIcons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** Key into the unread-counts map fetched below — omitted for items with no badge. */
  countKey?: "messages" | "notifications";
}

const items: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/community", label: "Community", icon: CommunityIcon },
  { href: "/community/rooms", label: "Fan Rooms", icon: MessageBubbleIcon },
  { href: "/matches", label: "Match Centre", icon: MatchCentreIcon },
  { href: "/predictions", label: "Predictions", icon: TrophyIcon },
  { href: "/members", label: "Members", icon: UsersIcon },
  { href: "/achievements", label: "Achievements", icon: StarShieldIcon },
  { href: "/messages", label: "Messages", icon: MessageBubbleIcon, countKey: "messages" },
  { href: "/notifications", label: "Notifications", icon: BellIcon, countKey: "notifications" },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin", icon: ShieldIcon };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Persistent left navigation rail for the signed-in app — the structural
 * piece the reference designs' "WEB APP" frames all share and this build was
 * missing (every authenticated page previously fell back to a single
 * centered column with nothing beside it). Only rendered inside AppShell,
 * which is only used by already-auth-gated pages, so no client-side auth
 * check is needed here — just the two unread badge counts, fetched the same
 * way Navbar already does for its own icon row.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      fetchUnreadCount(supabase, userId).then((notifications) =>
        setCounts((prev) => ({ ...prev, notifications })),
      );
      fetchUnreadConversationCount(supabase, userId).then((messages) =>
        setCounts((prev) => ({ ...prev, messages })),
      );
      supabase.rpc("has_role", { role_key: "super_admin" }).then(({ data: result }) => setIsSuperAdmin(Boolean(result)));
    });
  }, []);

  const visibleItems = isSuperAdmin ? [...items, ADMIN_ITEM] : items;

  return (
    <aside className="hidden shrink-0 lg:block lg:w-60" aria-label="Main">
      <div className="sticky top-20 flex flex-col gap-1 py-6 pr-4">
        {visibleItems.map(({ href, label, icon: Icon, countKey }) => {
          const active = isActive(pathname, href);
          const count = countKey ? counts[countKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                active ? "bg-white/10 text-white" : "text-text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={active ? "text-red-primary" : undefined}>
                <Icon size={20} />
              </span>
              <span className="flex-1">{label}</span>
              {count > 0 ? (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-primary px-1.5 text-[10px] font-semibold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
