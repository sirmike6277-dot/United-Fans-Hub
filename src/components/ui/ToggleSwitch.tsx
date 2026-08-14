"use client";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  /** Visually hides `label` while keeping it for screen readers — use when a visible label already sits next to this switch (see NotificationsPanel/AppearancePanel's own row layout) so it isn't announced twice. */
  labelHidden?: boolean;
}

/**
 * A real accessible switch — `role="switch"` + `aria-checked`, not a
 * repurposed checkbox — first needed for Settings → Notifications/
 * Appearance (previously permanent "Coming soon" placeholders, see
 * SettingsShell.tsx). No toggle/switch primitive existed anywhere in this
 * app before now.
 */
export function ToggleSwitch({ checked, onChange, disabled, label, labelHidden }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelHidden ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-red-primary bg-red-primary" : "border-white/15 bg-bg-elevated"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
