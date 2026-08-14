"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

export interface NotificationsPanelProps {
  currentUserId: string;
}

interface NotificationPreferences {
  community: boolean;
  messages: boolean;
  matches: boolean;
  awards: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  community: true,
  messages: true,
  matches: true,
  awards: true,
};

const ROWS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "community", label: "Community activity", description: "Likes, comments, replies, mentions, and new followers." },
  { key: "messages", label: "Messages", description: "New direct messages and Fan Room messages." },
  { key: "matches", label: "Matches & Predictions", description: "Kickoff reminders, live match events, and prediction reminders." },
  { key: "awards", label: "Awards & Achievements", description: "Nominations, voting windows, and unlocked achievements." },
];

/**
 * The "Notifications" settings tab's real content — was a permanent
 * "Coming soon" placeholder (SettingsShell.tsx's ComingSoonPanel). Backed
 * by the real profiles.notification_preferences column (migration
 * add_profiles_settings_columns) and actually enforced — turning a
 * category off here genuinely filters it out of the notification bell/
 * feed/unread-count (see src/lib/notifications/notifications.ts's
 * resolveAllowedTypes), not just a UI toggle that does nothing.
 *
 * Moderation notices (account warnings/suspensions) are deliberately not
 * listed here — they're never user-suppressible, always shown.
 */
export function NotificationsPanel({ currentUserId }: NotificationsPanelProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", currentUserId)
      .single()
      .then(({ data, error: fetchError }) => {
        setLoading(false);
        if (fetchError) {
          setError("Couldn't load your notification settings. Please try again.");
          return;
        }
        const raw = (data?.notification_preferences ?? {}) as Partial<NotificationPreferences>;
        setPrefs({ ...DEFAULT_PREFERENCES, ...raw });
      });
  }, [currentUserId]);

  async function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ notification_preferences: next })
      .eq("id", currentUserId);

    setSavingKey(null);
    if (updateError) {
      setPrefs(prefs); // revert on failure — never leave the UI claiming a save that didn't happen
      setError("Couldn't save that change. Please try again.");
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold uppercase text-white">Notifications</h2>
      <p className="mt-1 text-sm text-text-muted">
        Choose what shows up in your notification bell. Turning something off here doesn&apos;t
        stop it from happening — just from notifying you about it.
      </p>

      {error ? <p className="mt-4 text-sm text-red-hover">{error}</p> : null}

      <div className="mt-6 flex flex-col divide-y divide-white/10">
        {loading
          ? [0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse bg-white/5" />)
          : ROWS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{description}</p>
                </div>
                <ToggleSwitch
                  checked={prefs[key]}
                  onChange={(value) => handleToggle(key, value)}
                  disabled={savingKey === key}
                  label={label}
                  labelHidden
                />
              </div>
            ))}
      </div>

      <p className="mt-6 border-t border-white/10 pt-4 text-xs text-text-muted">
        Account-safety notices (like moderation actions on your account) always show — they
        can&apos;t be turned off here.
      </p>
    </div>
  );
}
