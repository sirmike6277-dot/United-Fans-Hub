"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "./FormError";

export interface VerificationErrorPanelProps {
  /** Supabase's own error_code (e.g. "otp_expired") — shown only as a small technical detail, not the headline message. */
  code: string | null;
}

/**
 * Landed on from /auth/callback when an email link (signup confirmation,
 * magic link, or password recovery) failed to verify — expired, already
 * used, or otherwise invalid. Supabase reports the same `otp_expired`-style
 * error for a genuinely expired link and for a link that's simply already
 * been used, so this deliberately doesn't claim to know which happened —
 * see the two real, most likely explanations below instead of guessing.
 */
export function VerificationErrorPanel({ code }: VerificationErrorPanelProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
    });

    setSending(false);

    if (resendError) {
      // Deliberately generic — confirming/denying whether an account
      // exists for this address here would leak account existence.
      setError("Couldn't send a new link right now. Please try again shortly.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase text-ink sm:text-3xl">
          Link Expired or Invalid
        </h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          This verification link didn&apos;t work — it may have expired, already been used, or your
          email client may have opened it automatically before you clicked it yourself.
        </p>
        {code ? <p className="mt-1 text-xs text-text-muted/70">Reference: {code}</p> : null}
      </div>

      {sent ? (
        <p className="max-w-sm text-sm text-text-muted">
          If an account exists for <span className="text-ink">{email}</span>, a new verification
          link is on its way — check your inbox (and spam folder).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
          {error ? <FormError message={error} /> : null}
          <Input
            type="email"
            placeholder="Your email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            required
          />
          <Button type="submit" loading={sending} disabled={sending || !email.trim()}>
            {sending ? "Sending..." : "Send a new verification link"}
          </Button>
        </form>
      )}

      <Button href="/login" variant="ghost" size="sm">
        Already verified? Sign in
      </Button>
    </div>
  );
}
