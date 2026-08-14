"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { resolveTheme, applyThemeAttribute, writeStoredThemeMode, type ThemeMode } from "@/lib/theme/resolveTheme";

export interface AppearancePanelProps {
  currentUserId: string;
}

interface AppearancePreferences {
  reduce_motion: boolean;
  text_size: "normal" | "large";
  theme: ThemeMode;
}

const DEFAULTS: AppearancePreferences = { reduce_motion: false, text_size: "normal", theme: "auto" };

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Light 6am–6pm, dark otherwise — follows this device's clock" },
  { value: "light", label: "Light", description: "Always light" },
  { value: "dark", label: "Dark", description: "Always dark" },
];

/**
 * The "Appearance" settings tab's real content — was a permanent "Coming
 * soon" placeholder, then reduce-motion/text-size (still real, still here).
 * Theme (auto/light/dark) joins them: a real light palette for the app
 * chrome, not just a CSS media query nobody can override — see
 * globals.css's `[data-theme="light"]` block and AppearanceEffect.tsx
 * (applies it globally, keeps "auto" live-synced to the clock). The
 * landing page, auth screens, and stadium-photo banners deliberately keep
 * their cinematic dark treatment regardless of this setting.
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
      .update({
        appearance_preferences: { reduce_motion: next.reduce_motion, text_size: next.text_size, theme: next.theme },
      })
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
    applyThemeAttribute(resolveTheme(next.theme));
    // Mirror immediately — the next page load's no-flash script reads this
    // synchronously, before Supabase has had a chance to answer.
    writeStoredThemeMode(next.theme);
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold uppercase text-red-primary">Appearance</h2>
      <p className="mt-1 text-sm text-text-muted">
        Real accessibility and display controls — applied everywhere in the app the moment you change them.
      </p>

      {error ? <p className="mt-4 text-sm text-red-hover">{error}</p> : null}

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="h-16 animate-pulse rounded-control bg-ink/5" />
          <div className="h-16 animate-pulse rounded-control bg-ink/5" />
          <div className="h-16 animate-pulse rounded-control bg-ink/5" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col divide-y divide-ink/10">
          <div className="flex flex-col gap-3 py-4 first:pt-0">
            <div>
              <p className="text-sm font-medium text-ink">Theme</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Auto switches with real-time day/night on this device — pick Light or Dark to override it.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="grid grid-cols-3 gap-2 rounded-control border border-ink/10 bg-bg-elevated p-1"
            >
              {THEME_OPTIONS.map((option) => {
                const selected = prefs.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={option.description}
                    disabled={saving}
                    onClick={() => save({ ...prefs, theme: option.value })}
                    className={`rounded-control px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "bg-red-primary text-white" : "text-text-muted hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Reduce motion</p>
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
              <p className="text-sm font-medium text-ink">Larger text</p>
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
