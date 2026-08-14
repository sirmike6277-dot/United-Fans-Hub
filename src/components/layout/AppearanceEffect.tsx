"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  resolveTheme,
  msUntilNextThemeBoundary,
  applyThemeAttribute,
  writeStoredThemeMode,
  type ThemeMode,
} from "@/lib/theme/resolveTheme";

interface AppearancePreferences {
  reduce_motion: boolean;
  text_size: "normal" | "large";
  theme: ThemeMode;
}

const DEFAULTS: AppearancePreferences = { reduce_motion: false, text_size: "normal", theme: "auto" };

/**
 * Applies the signed-in user's real Settings → Appearance preferences
 * (profiles.appearance_preferences) globally, on every signed-in page —
 * rendered once inside AppShell.tsx. Self-fetching client component, same
 * established pattern as Navbar/Sidebar's own independent data fetches
 * (no Context/global state introduced for this). Renders nothing visible
 * itself — it only sets data-* attributes on <html>, which globals.css
 * then reads (see the Settings → Appearance rules added there).
 *
 * `theme` is the one preference here that isn't "set once and forget it":
 * in "auto" mode it has to keep tracking the real-time day/night boundary
 * for as long as this page stays open, not just resolve once at mount —
 * see the boundary-scheduling effect below.
 */
export function AppearanceEffect() {
  const [prefs, setPrefs] = useState<AppearancePreferences | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      supabase
        .from("profiles")
        .select("appearance_preferences")
        .eq("id", userId)
        .single()
        .then(({ data: row }) => {
          const raw = (row?.appearance_preferences ?? {}) as Partial<AppearancePreferences>;
          const resolved = { ...DEFAULTS, ...raw };
          setPrefs(resolved);
          // Mirror into localStorage so layout.tsx's synchronous no-flash
          // script can resolve this account's real preference on the very
          // next load, before Supabase has answered — and so a signed-out
          // page reached from this same browser afterwards (landing, auth)
          // still knows it.
          writeStoredThemeMode(resolved.theme);
        });
    });
  }, []);

  useEffect(() => {
    if (!prefs) return;
    const root = document.documentElement;
    root.setAttribute("data-reduce-motion", String(prefs.reduce_motion));
    root.setAttribute("data-text-size", prefs.text_size);
    return () => {
      root.removeAttribute("data-reduce-motion");
      root.removeAttribute("data-text-size");
    };
  }, [prefs]);

  useEffect(() => {
    if (!prefs) return;

    applyThemeAttribute(resolveTheme(prefs.theme));

    // Next.js client-side navigation keeps <html> itself mounted across
    // route changes, so the attribute this effect sets simply carries over
    // to wherever the visitor navigates next — including the landing page
    // and auth screens, which is now correct: their UI chrome (Navbar,
    // Footer, the auth form panel) is theme-reactive too. Only the
    // permanently-cinematic photography sections (landing hero,
    // stadium banners, the auth visual/backdrop column) don't read
    // data-theme at all, so this attribute persisting has no effect on
    // them either way. Deliberately NOT reset on unmount (it used to be —
    // that forced an instant dark flash on every single navigation while
    // the next mount's async fetch re-applied the real preference).
    //
    // Only "auto" needs to keep watching the clock — "light"/"dark" are a
    // fixed manual override, already applied above, nothing left to do.
    if (prefs.theme !== "auto") return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        applyThemeAttribute(resolveTheme("auto"));
        scheduleNext();
      }, msUntilNextThemeBoundary());
    };
    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [prefs]);

  return null;
}
