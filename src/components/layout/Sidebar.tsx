"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchUnreadCount } from "@/lib/notifications/notifications";
import { fetchUnreadConversationCount } from "@/lib/messaging/conversations";
import { NAV_ITEMS, MODERATION_NAV_ITEM, ADMIN_NAV_ITEM } from "./navItems";

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
  const [isModerator, setIsModerator] = useState(false);

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
      supabase.rpc("has_role", { role_key: "moderator" }).then(({ data: result }) => setIsModerator(Boolean(result)));
    });
  }, []);

  const visibleItems = [
    ...NAV_ITEMS,
    ...(isModerator || isSuperAdmin ? [MODERATION_NAV_ITEM] : []),
    ...(isSuperAdmin ? [ADMIN_NAV_ITEM] : []),
  ];

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
                active ? "bg-ink/10 text-ink" : "text-text-muted hover:bg-ink/5 hover:text-ink"
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
