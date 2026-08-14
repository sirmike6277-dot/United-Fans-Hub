"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { BellIcon } from "@/components/notifications/NotificationIcons";
import { fetchUnreadCount } from "@/lib/notifications/notifications";
import { MessageBubbleIcon } from "@/components/messaging/MessagingIcons";
import { fetchUnreadConversationCount } from "@/lib/messaging/conversations";
import { NAV_ITEMS, MODERATION_NAV_ITEM, ADMIN_NAV_ITEM } from "./navItems";
import { SunIcon, MoonIcon } from "./ShellIcons";
import { applyThemeAttribute, type ThemeMode } from "@/lib/theme/resolveTheme";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#community", label: "Community" },
  { href: "#matchday", label: "Matches" },
  { href: "#rankings", label: "Rankings" },
  { href: "#about", label: "About" },
];

const MOBILE_MENU_ID = "mobile-nav-menu";

/**
 * "Matches" always reaches the real, public Match Centre — unlike
 * "Community" (which stays an in-page anchor for signed-out visitors,
 * since /community itself is auth-gated), /matches has no auth
 * requirement, so there's no signed-in/signed-out distinction to make.
 * "Rankings" now does the same for the real leaderboard (Phase 8B) —
 * previously it always pointed at the landing page's marketing preview
 * section even for a signed-in fan who has a real leaderboard to look at.
 *
 * The remaining plain anchors (#features, #about, and #community/#rankings
 * when signed out) only resolve to something on the landing page itself —
 * from any other page, a bare `#features` href just appends the hash to
 * the *current* URL and does nothing (no matching id exists there). Since
 * there's no dedicated /features or /about page to link to instead, the
 * fix is to qualify the anchor with `/` so it actually navigates home
 * first, exactly like a normal same-page anchor already behaves when
 * you're on "/" itself.
 */
function resolveNavHref(href: string, { signedIn, pathname }: { signedIn: boolean; pathname: string }): string {
  if (href === "#matchday") return "/matches";
  if (href === "#community" && signedIn) return "/community";
  if (href === "#rankings" && signedIn) return "/predictions";
  return pathname === "/" ? href : `/${href}`;
}

/** True for the exact route or any of its sub-routes (e.g. /profile/edit counts as /profile being active). */
function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface NavbarProps {
  /** Server-rendered branding (wordmark + club emblem) — see <Brand />. */
  brand: ReactNode;
}

export function Navbar({ brand }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Same real has_role() RPC checks Sidebar.tsx already makes — needed
  // here too now that the mobile menu renders the same role-gated
  // Moderation/Admin items Sidebar does (see navItems.ts). Fetched
  // independently rather than shared via context, matching this
  // component's existing pattern of self-fetching its own unread counts
  // rather than receiving them as props.
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Starts false (matches the app's true default/fallback — no data-theme
  // attribute at all means dark, see globals.css) and is corrected from the
  // real DOM attribute the instant this mounts client-side — never resolved
  // from the clock directly here, unlike AppearanceEffect. That avoids a
  // second, independent "what time is it" resolution (with its own
  // server/client hydration-mismatch risk) existing alongside the one
  // AppearanceEffect already owns; this just reads and toggles whatever
  // AppearanceEffect already applied to <html>, the single source of truth.
  const [isLight, setIsLight] = useState(
    () => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light",
  );
  const [themeSaving, setThemeSaving] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile menu and returns focus to the toggle button —
  // without this, a keyboard user has no way to dismiss it except tabbing
  // all the way through every link inside.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuToggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Mirrors <html data-theme>, whatever set it (AppearanceEffect on load,
  // its own live auto-mode boundary timer, or this button's own click) —
  // a MutationObserver instead of re-deriving the value, so there is
  // exactly one piece of code in the app that decides "is it light or dark
  // right now" (see AppearanceEffect/resolveTheme) and everything else,
  // including this button's icon, just reflects it.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsLight(root.getAttribute("data-theme") === "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  async function handleToggleTheme() {
    if (!userId || themeSaving) return;
    const nextMode: ThemeMode = isLight ? "dark" : "light";

    // Optimistic — the reader sees the switch instantly, matching every
    // other toggle in this app (AppearancePanel's own save() does the same).
    applyThemeAttribute(nextMode);
    setThemeSaving(true);

    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("appearance_preferences").eq("id", userId).single();
    const current = (data?.appearance_preferences ?? {}) as Record<string, unknown>;
    await supabase
      .from("profiles")
      .update({ appearance_preferences: { ...current, theme: nextMode } })
      .eq("id", userId);
    setThemeSaving(false);
  }

  useEffect(() => {
    const supabase = createClient();

    function refreshUnreadCount(userId: string | undefined) {
      if (!userId) {
        setUnreadCount(0);
        setUnreadMessages(0);
        return;
      }
      fetchUnreadCount(supabase, userId).then(setUnreadCount);
      fetchUnreadConversationCount(supabase, userId).then(setUnreadMessages);
    }

    function refreshRoleFlags(userId: string | undefined) {
      if (!userId) {
        setIsSuperAdmin(false);
        setIsModerator(false);
        return;
      }
      supabase.rpc("has_role", { role_key: "super_admin" }).then(({ data }) => setIsSuperAdmin(Boolean(data)));
      supabase.rpc("has_role", { role_key: "moderator" }).then(({ data }) => setIsModerator(Boolean(data)));
    }

    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setUserId(data.user?.id ?? null);
      refreshUnreadCount(data.user?.id);
      refreshRoleFlags(data.user?.id);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      setUserId(session?.user?.id ?? null);
      refreshUnreadCount(session?.user?.id);
      refreshRoleFlags(session?.user?.id);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // The mobile menu's real nav list — same source, same role gating, as
  // Sidebar's desktop-only rail. See navItems.ts for why these two used to
  // be separate, silently-diverging lists.
  const unreadCounts = { messages: unreadMessages, notifications: unreadCount };
  const mobileNavItems = [
    ...NAV_ITEMS,
    ...(isModerator || isSuperAdmin ? [MODERATION_NAV_ITEM] : []),
    ...(isSuperAdmin ? [ADMIN_NAV_ITEM] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-bg-elevated/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {brand}

        {/* Marketing nav — the landing page's own section anchors. Signed-in
            fans have a real app (see Sidebar) and never need "Features"/
            "Community"/"Matches" pointing back at the pitch they already
            joined, so this is signed-out only. */}
        {!signedIn ? (
          <ul className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => {
              const resolved = resolveNavHref(link.href, { signedIn, pathname });
              const active = !resolved.includes("#") && isRouteActive(pathname, resolved);
              return (
                <li key={link.href}>
                  <Link
                    href={resolved}
                    aria-current={active ? "page" : undefined}
                    className={`text-sm font-medium transition-colors hover:text-ink ${
                      active ? "text-ink" : "text-text-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <>
              {/* Only quick-access items live here now — full navigation is
                  the Sidebar's job (see AppShell). Duplicating Home/Members/
                  Predictions in both places was the clutter the header
                  redesign was meant to remove. */}
              <button
                type="button"
                onClick={handleToggleTheme}
                disabled={themeSaving}
                aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
                title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                className="flex h-10 w-10 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:opacity-50"
              >
                {isLight ? <MoonIcon /> : <SunIcon />}
              </button>
              <Link
                href="/messages"
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                aria-current={isRouteActive(pathname, "/messages") ? "page" : undefined}
                className={`relative flex h-10 w-10 items-center justify-center rounded-control transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  isRouteActive(pathname, "/messages") ? "bg-ink/10 text-ink" : "text-text-muted"
                }`}
              >
                <MessageBubbleIcon />
                {unreadMessages > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-primary px-1 text-[10px] font-semibold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-current={isRouteActive(pathname, "/notifications") ? "page" : undefined}
                className={`relative flex h-10 w-10 items-center justify-center rounded-control transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  isRouteActive(pathname, "/notifications") ? "bg-ink/10 text-ink" : "text-text-muted"
                }`}
              >
                <BellIcon />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-primary px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <Button
                href="/profile"
                variant="ghost"
                size="sm"
                aria-current={isRouteActive(pathname, "/profile") ? "page" : undefined}
                className={isRouteActive(pathname, "/profile") ? "!text-ink bg-ink/10" : undefined}
              >
                Profile
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Login
              </Button>
              <Button href="/signup" size="sm">
                Join Now
              </Button>
            </>
          )}
        </div>

        <button
          ref={menuToggleRef}
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-control text-ink lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-ink transition-transform ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 bg-ink transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 bg-ink transition-transform ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      {open ? (
        // max-h + overflow-y-auto keeps this a bounded, scrollable dropdown
        // instead of a plain block that just keeps growing — the signed-in
        // list alone is 12 nav items + Logout, which on a phone screen
        // otherwise runs well past one full viewport with no way to tell
        // it's a dropdown rather than the page taking over. 100dvh (not
        // 100vh) so mobile Safari's collapsing address bar doesn't leave a
        // panel that's taller than what's actually visible.
        <div
          id={MOBILE_MENU_ID}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-ink/10 bg-bg-elevated px-4 py-4 lg:hidden"
        >
          {!signedIn ? (
            <ul className="flex flex-col gap-4">
              {navLinks.map((link) => {
                const resolved = resolveNavHref(link.href, { signedIn, pathname });
                const active = !resolved.includes("#") && isRouteActive(pathname, resolved);
                return (
                  <li key={link.href}>
                    <Link
                      href={resolved}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block text-sm font-medium hover:text-ink ${active ? "text-ink" : "text-text-muted"}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className={signedIn ? "flex flex-col gap-3" : "mt-6 flex flex-col gap-3"}>
            {signedIn ? (
              <>
                <Button variant="secondary" onClick={handleToggleTheme} disabled={themeSaving}>
                  {isLight ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                  {isLight ? "Switch to dark mode" : "Switch to light mode"}
                </Button>
                {mobileNavItems.map(({ href, label, icon: Icon, countKey }) => {
                  const active = isRouteActive(pathname, href);
                  const count = countKey ? unreadCounts[countKey] : 0;
                  return (
                    <Button
                      key={href}
                      href={href}
                      variant="secondary"
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={active ? "!border-red-primary" : undefined}
                    >
                      <Icon size={16} />
                      {label}
                      {count > 0 ? (
                        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-primary px-1.5 text-[10px] font-semibold text-white">
                          {count > 9 ? "9+" : count}
                        </span>
                      ) : null}
                    </Button>
                  );
                })}
                <Button onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Button href="/login" variant="secondary" onClick={() => setOpen(false)}>
                  Login
                </Button>
                <Button href="/signup" onClick={() => setOpen(false)}>
                  Join Now
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
