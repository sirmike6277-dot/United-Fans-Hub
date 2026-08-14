"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

export interface AppearancePanelProps {
  currentUserId: string;
}

interface AppearancePreferences {
  reduce_motion: boolean;
  text_size: "normal" | "large";
}

const DEFAULTS: AppearancePreferences = { reduce_motion: false, text_size: "normal" };

/**
 * The "Appearance" settings tab's real content — was a permanent "Coming
 * soon" placeholder. Deliberately not a light/dark theme: this app has
 * exactly one designed palette and no theme system at all (confirmed
 * before building this — see the phase report), and a real light mode
 * would mean re-skinning every component, out of scope. Two real, small,
 * genuinely-working controls instead, both backed by
 * profiles.appearance_preferences and actually applied globally by
 * AppearanceEffect.tsx (rendered once in AppShell) — not a toggle that
 * just sits there.
 */
export function AppearancePanel({ currentUserId }: AppearancePanelProps) {
  const [prefs, setPrefs] = useState<AppearancePreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("appearance_preferences")
      .eq("id", currentUserId)
      .single()
      .then(({ data, error: fetchError }) => {
        setLoading(false);
        if (fetchError) {
          setError("Couldn't load your appearance settings. Please try again.");
          return;
        }
        const raw = (data?.appearance_preferences ?? {}) as Partial<AppearancePreferences>;
        setPrefs({ ...DEFAULTS, ...raw });
      });
  }, [currentUserId]);

  async function save(next: AppearancePreferences) {
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    setError(null);

    const supabase = createClient();
    // A fresh object literal here (not the named-interface-typed `next`
    // variable) so TypeScript infers an anonymous type that structurally
    // satisfies the generated `Json` column type automatically — a named
    // interface used as a value's type doesn't get that same implicit
    // index-signature compatibility.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ appearance_preferences: { reduce_motion: next.reduce_motion, text_size: next.text_size } })
      .eq("id", currentUserId);

    setSaving(false);
    if (updateError) {
      setPrefs(previous);
      setError("Couldn't save that change. Please try again.");
      return;
    }
    // Apply immediately in this tab too, not just on next page load —
    // AppearanceEffect only re-reads on mount, so a live save here would
    // otherwise need a full refresh to actually be visible.
    document.documentElement.setAttribute("data-reduce-motion", String(next.reduce_motion));
    document.documentElement.setAttribute("data-text-size", next.text_size);
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold uppercase text-white">Appearance</h2>
      <p className="mt-1 text-sm text-text-muted">
        Real accessibility controls — applied everywhere in the app the moment you change them.
      </p>

      {error ? <p className="mt-4 text-sm text-red-hover">{error}</p> : null}

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="h-16 animate-pulse rounded-control bg-white/5" />
          <div className="h-16 animate-pulse rounded-control bg-white/5" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col divide-y divide-white/10">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Reduce motion</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Turns off animations and transitions across the app.
              </p>
            </div>
            <ToggleSwitch
              checked={prefs.reduce_motion}
              onChange={(value) => save({ ...prefs, reduce_motion: value })}
              disabled={saving}
              label="Reduce motion"
              labelHidden
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Larger text</p>
              <p className="mt-0.5 text-xs text-text-muted">Increases text size across the app.</p>
            </div>
            <ToggleSwitch
              checked={prefs.text_size === "large"}
              onChange={(value) => save({ ...prefs, text_size: value ? "large" : "normal" })}
              disabled={saving}
              label="Larger text"
              labelHidden
            />
          </div>
        </div>
      )}
    </div>
  );
}
