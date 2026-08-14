"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { GearIcon } from "@/components/layout/ShellIcons";
import { BellIcon } from "@/components/notifications/NotificationIcons";
import { BlockedMutedPanel } from "./BlockedMutedPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { AppearancePanel } from "./AppearancePanel";
import { HelpPanel } from "./HelpPanel";

export interface SettingsShellProps {
  profileId: string;
  username: string;
  email: string;
  initialDisplayName: string;
  initialBio: string;
}

const STATIC_TABS = [
  { key: "notifications", label: "Notifications", icon: BellIcon },
  { key: "privacy", label: "Privacy", icon: LockGlyph },
  { key: "appearance", label: "Appearance", icon: GearIcon },
  { key: "help", label: "Help", icon: HelpGlyph },
] as const;

function LockGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function HelpGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.6v.3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AccountPanel({ profileId, username, email, initialDisplayName, initialBio }: SettingsShellProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null, bio: bio || null })
      .eq("id", profileId);

    setSaving(false);
    if (updateError) {
      setError("We couldn't save your changes. Please try again.");
      return;
    }
    setSaved(true);
  }

  async function handlePasswordReset() {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold uppercase text-white">Account Settings</h2>

      {error ? <FormError message={error} /> : null}
      {saved ? <p className="text-sm text-green-400">Changes saved.</p> : null}

      <Input label="Username" value={`@${username}`} disabled readOnly />
      <Input label="Email" value={email} disabled readOnly />

      <Input
        label="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={saving}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={saving}
          rows={3}
          maxLength={280}
          className="rounded-control border border-white/10 bg-bg-elevated px-4 py-3 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving} disabled={saving}>
          Save Changes
        </Button>
        <Button href="/profile/edit" variant="secondary" type="button">
          Edit full fan profile
        </Button>
      </div>

      <div className="mt-2 border-t border-white/10 pt-5">
        <p className="text-sm font-medium text-white">Password</p>
        <p className="mt-1 text-xs text-text-muted">
          We&apos;ll email you a secure link to set a new password.
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handlePasswordReset}>
          {resetSent ? "Reset link sent" : "Send password reset link"}
        </Button>
      </div>
    </form>
  );
}

export function SettingsShell(props: SettingsShellProps) {
  const router = useRouter();
  const [active, setActive] = useState<string>("account");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navItemClass = (key: string) =>
    `flex items-center gap-3 rounded-control px-4 py-2.5 text-left text-sm font-medium transition-colors ${
      active === key ? "bg-red-primary text-white" : "text-text-muted hover:bg-white/5 hover:text-white"
    }`;

  let panel: ReactNode;
  if (active === "account") {
    panel = <AccountPanel {...props} />;
  } else if (active === "privacy") {
    panel = <BlockedMutedPanel currentUserId={props.profileId} />;
  } else if (active === "notifications") {
    panel = <NotificationsPanel currentUserId={props.profileId} />;
  } else if (active === "appearance") {
    panel = <AppearancePanel currentUserId={props.profileId} />;
  } else {
    panel = <HelpPanel />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex flex-col gap-1" aria-label="Settings">
        <button type="button" onClick={() => setActive("account")} className={navItemClass("account")}>
          <GearIcon size={18} />
          Account
        </button>
        {STATIC_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setActive(key)} className={navItemClass(key)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex items-center gap-3 rounded-control px-4 py-2.5 text-left text-sm font-medium text-red-primary transition-colors hover:bg-red-primary/10"
        >
          Log out
        </button>
      </nav>

      <div className="rounded-card border border-white/10 bg-bg-surface p-6 sm:p-8">{panel}</div>
    </div>
  );
}
