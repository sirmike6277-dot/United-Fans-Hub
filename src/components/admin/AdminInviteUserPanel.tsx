"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmailIcon } from "@/components/auth/FieldIcons";

/**
 * Admin-only "invite someone to create an account" panel — the client half
 * of src/app/api/admin/invite-user/route.ts (the actual super_admin gate
 * and the auth.admin.inviteUserByEmail call both live server-side; this
 * component never touches service_role). Same visual language as
 * AdminRolesManager's own bordered surface, so the two panels read as one
 * consistent admin page rather than two differently-styled tools bolted
 * together.
 */
export function AdminInviteUserPanel() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSentTo(null);

    const trimmed = email.trim();

    const response = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const result = await response.json();

    setSending(false);

    if (!response.ok) {
      setError(result.error ?? "Couldn't send the invite. Please try again.");
      return;
    }

    setSentTo(trimmed);
    setEmail("");
  }

  return (
    <div className="rounded-card border border-ink/10 bg-bg-surface p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Invite a fan</h2>
      <p className="mt-1 text-xs text-text-muted">
        Send an email invitation to create a United Fans Hub account. They&apos;ll set their own
        password after accepting.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          type="email"
          aria-label="Email address to invite"
          placeholder="fan@example.com"
          icon={<EmailIcon />}
          className="sm:max-w-xs"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sending}
          required
        />
        <Button type="submit" size="md" loading={sending} disabled={sending || !email.trim()}>
          {sending ? "Sending..." : "Send Invite"}
        </Button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-hover">{error}</p> : null}
      {sentTo ? (
        <p className="mt-3 text-sm text-ink">
          Invitation sent to <strong className="font-medium">{sentTo}</strong>.
        </p>
      ) : null}
    </div>
  );
}
