"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveTheme, msUntilNextThemeBoundary, applyThemeAttribute, type ThemeMode } from "@/lib/theme/resolveTheme";

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
          setPrefs({ ...DEFAULTS, ...raw });
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
    // route changes — AppShell (and this effect) unmounting when a
    // signed-in visitor navigates to the landing page or an auth screen
    // does NOT reset any attribute already sitting on <html> unless this
    // cleanup does it explicitly. Without this, a light-theme fan clicking
    // through to "/" would carry data-theme="light" onto a page whose own
    // bg-bg-void/bg-bg-elevated etc. never expected to be overridden —
    // exactly the "landing page stays dark regardless of theme" rule
    // silently breaking on navigation, not on first load.
    const clearOnUnmount = () => applyThemeAttribute("dark");

    // Only "auto" needs to keep watching the clock — "light"/"dark" are a
    // fixed manual override, already applied above, nothing left to
    // schedule, just the same unmount cleanup.
    if (prefs.theme !== "auto") return clearOnUnmount;

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        applyThemeAttribute(resolveTheme("auto"));
        scheduleNext();
      }, msUntilNextThemeBoundary());
    };
    scheduleNext();

    return () => {
      clearTimeout(timeoutId);
      clearOnUnmount();
    };
  }, [prefs]);

  return null;
}
