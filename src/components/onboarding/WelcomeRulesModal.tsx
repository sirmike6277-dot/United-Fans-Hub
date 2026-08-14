"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export interface WelcomeRulesModalProps {
  profileId: string;
  /**
   * The club emblem, rendered by the caller and passed in — ClubEmblem
   * itself is a server-only component (checks the asset exists on disk
   * via Node's `fs`), so it can't be imported directly into this "use
   * client" component (that broke the production build: "Module not
   * found: Can't resolve 'fs'"). Standard React Server/Client composition
   * instead: the server-rendered element is passed down as a prop, not
   * instantiated here.
   */
  logo: ReactNode;
}

/**
 * Shown once to a genuinely new signup, never retroactively to an
 * existing member — gated on profiles.onboarding_seen_at being null, and
 * every pre-existing row was backfilled to now() in the same migration
 * that added the column, so only rows created after it start null (see
 * add_profiles_settings_columns). Rendered from dashboard/page.tsx, the
 * app's real, established post-signup/post-login landing point.
 *
 * Deliberately NOT dismissible via backdrop click or Escape — unlike
 * CreateRoomDialog/ReportDialog (this app's other hand-rolled modals,
 * there's no shared Modal component to extend — see those two for the
 * base recipe this follows), this one requires the explicit "I Understand
 * & Agree" action before it'll go away, since it's the one place every
 * new member is guaranteed to see the real community rules.
 */
export function WelcomeRulesModal({ profileId, logo }: WelcomeRulesModalProps) {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleAgree() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ onboarding_seen_at: new Date().toISOString() }).eq("id", profileId);
    setSaving(false);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-rules-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-card border border-ink/10 bg-bg-surface shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
          {logo}
          <h2 id="welcome-rules-title" className="font-display text-xl font-bold uppercase text-red-primary">
            Welcome to United Fans Hub
          </h2>
          <p className="text-sm text-text-muted">
            Before you dive in, a few real things worth knowing about how this community works.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-5 overflow-y-auto px-6 text-sm leading-relaxed text-text-body">
          <section>
            <h3 className="font-display text-sm font-bold uppercase text-ink">Respect every fan</h3>
            <p className="mt-1.5">
              Everyone here supports the same club — disagree with each other&apos;s opinions all
              you like, but treat the person on the other end of it with respect.{" "}
              <strong className="font-medium text-ink">
                Insults, harassment, and hate speech — including racial slurs — are never
                acceptable
              </strong>
              , anywhere in the app.
            </p>
          </section>

          <section>
            <h3 className="font-display text-sm font-bold uppercase text-ink">If something goes wrong</h3>
            <p className="mt-1.5">
              Report any post, comment, message, or profile — every report is reviewed by a real
              moderator. Depending on what happened, that can mean the content being removed, a
              warning, or an account suspension or ban. Fan Rooms can also kick or ban a member
              from that specific room. You can also block or mute anyone yourself, no moderator
              needed.
            </p>
          </section>

          <section>
            <h3 className="font-display text-sm font-bold uppercase text-ink">How to earn points</h3>
            <p className="mt-1.5">
              Match Predictions are where points come from today: +3 for the correct result, +5
              more for the exact scoreline, +3 for the correct first goalscorer. Your points climb
              the Fan Level ladder — Fan → Regular → Supporter → Loyal Fan → Superfan → Legend.
            </p>
          </section>

          <section>
            <h3 className="font-display text-sm font-bold uppercase text-ink">Fan of the Month & Season</h3>
            <p className="mt-1.5">
              Any member can nominate a fellow fan — you can&apos;t nominate yourself. A moderator
              approves real nominations, then the community votes. Most votes when voting closes
              wins — decided by your fellow fans, not by points.
            </p>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-ink/10 px-6 py-5">
          <Button type="button" onClick={handleAgree} loading={saving} disabled={saving}>
            I Understand &amp; Agree
          </Button>
          <p className="text-center text-xs text-text-muted">
            By continuing you agree to our{" "}
            <a href="/terms" target="_blank" rel="noreferrer" className="text-red-primary hover:text-red-hover">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="text-red-primary hover:text-red-hover">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
