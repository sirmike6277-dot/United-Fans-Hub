"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AppearancePreferences {
  reduce_motion: boolean;
  text_size: "normal" | "large";
}

const DEFAULTS: AppearancePreferences = { reduce_motion: false, text_size: "normal" };

/**
 * Applies the signed-in user's real Settings → Appearance preferences
 * (profiles.appearance_preferences) globally, on every signed-in page —
 * rendered once inside AppShell.tsx. Self-fetching client component, same
 * established pattern as Navbar/Sidebar's own independent data fetches
 * (no Context/global state introduced for this). Renders nothing visible
 * itself — it only sets data-* attributes on <html>, which globals.css
 * then reads (see the Settings → Appearance rules added there).
 *
 * Deliberately React-render-time "adjust state during render" is not
 * needed here (unlike Tabs.tsx's URL-sync case) — this only ever runs
 * once per mount, no prop it needs to stay in sync with changes on its
 * own, so a plain effect is the right tool.
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

  return null;
}
