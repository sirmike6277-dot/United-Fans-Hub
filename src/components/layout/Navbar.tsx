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
import { UsersIcon } from "@/components/members/MembersIcons";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import { HomeIcon } from "./ShellIcons";

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

    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      refreshUnreadCount(data.user?.id);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      refreshUnreadCount(session?.user?.id);
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-elevated/90 backdrop-blur">
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
                    className={`text-sm font-medium transition-colors hover:text-white ${
                      active ? "text-white" : "text-text-muted"
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
              <Link
                href="/messages"
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                aria-current={isRouteActive(pathname, "/messages") ? "page" : undefined}
                className={`relative flex h-10 w-10 items-center justify-center rounded-control transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  isRouteActive(pathname, "/messages") ? "bg-white/10 text-white" : "text-text-muted"
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
                className={`relative flex h-10 w-10 items-center justify-center rounded-control transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  isRouteActive(pathname, "/notifications") ? "bg-white/10 text-white" : "text-text-muted"
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
                className={isRouteActive(pathname, "/profile") ? "!text-white bg-white/10" : undefined}
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
          className="flex h-10 w-10 items-center justify-center rounded-control text-white lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-white transition-transform ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 bg-white transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 bg-white transition-transform ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      {open ? (
        <div id={MOBILE_MENU_ID} className="border-t border-white/10 bg-bg-elevated px-4 py-4 lg:hidden">
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
                      className={`block text-sm font-medium hover:text-white ${active ? "text-white" : "text-text-muted"}`}
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
                <Button
                  href="/dashboard"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/dashboard") ? "page" : undefined}
                  className={isRouteActive(pathname, "/dashboard") ? "!border-red-primary" : undefined}
                >
                  <HomeIcon size={16} />
                  Home
                </Button>
                <Button
                  href="/community/rooms"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/community/rooms") ? "page" : undefined}
                  className={isRouteActive(pathname, "/community/rooms") ? "!border-red-primary" : undefined}
                >
                  <MessageBubbleIcon size={16} />
                  Fan Rooms
                </Button>
                <Button
                  href="/members"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/members") ? "page" : undefined}
                  className={isRouteActive(pathname, "/members") ? "!border-red-primary" : undefined}
                >
                  <UsersIcon size={16} />
                  Members
                </Button>
                <Button
                  href="/predictions"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/predictions") ? "page" : undefined}
                  className={isRouteActive(pathname, "/predictions") ? "!border-red-primary" : undefined}
                >
                  <TrophyIcon size={16} />
                  Predictions
                </Button>
                <Button
                  href="/messages"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/messages") ? "page" : undefined}
                  className={isRouteActive(pathname, "/messages") ? "!border-red-primary" : undefined}
                >
                  <MessageBubbleIcon size={16} />
                  Messages
                  {unreadMessages > 0 ? (
                    <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-primary px-1.5 text-[10px] font-semibold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  ) : null}
                </Button>
                <Button
                  href="/notifications"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/notifications") ? "page" : undefined}
                  className={isRouteActive(pathname, "/notifications") ? "!border-red-primary" : undefined}
                >
                  <BellIcon size={16} />
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-primary px-1.5 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Button>
                <Button
                  href="/profile"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  aria-current={isRouteActive(pathname, "/profile") ? "page" : undefined}
                  className={isRouteActive(pathname, "/profile") ? "!border-red-primary" : undefined}
                >
                  Profile
                </Button>
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
