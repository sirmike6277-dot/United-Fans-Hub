"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/auth/FormError";
import { NomineeSearchInput } from "./NomineeSearchInput";
import { createNomination } from "@/lib/awards/awards";
import type { FeedAuthor } from "@/lib/community/posts";

export interface NominationFormProps {
  periodId: string;
  currentUserId: string;
  onSubmitted: () => void;
}

const MAX_REASON_LENGTH = 280;

/**
 * Nominations go to `status='pending'` and aren't visible to anyone else
 * until an award manager approves them (see award_nominations' own SELECT
 * policy) — the success message says so explicitly rather than implying
 * the nominee now appears for everyone.
 */
export function NominationForm({ periodId, currentUserId, onSubmitted }: NominationFormProps) {
  const [nominee, setNominee] = useState<FeedAuthor | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nominee || submitting) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: submitError } = await createNomination(supabase, {
      periodId,
      nomineeProfileId: nominee.id,
      nominatedBy: currentUserId,
      reason: reason.trim() || null,
    });
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }
    setSubmitted(true);
    onSubmitted();
  }

  if (submitted) {
    return (
      <p className="rounded-control border border-white/10 bg-bg-elevated px-4 py-3 text-sm text-text-body">
        Nomination submitted — it&apos;ll appear here once a moderator reviews it.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-white/10 bg-bg-surface p-4">
      <p className="text-sm font-medium text-white">Nominate a fan</p>
      {error ? <FormError message={error} /> : null}

      <NomineeSearchInput currentUserId={currentUserId} selected={nominee} onSelect={setNominee} />

      <div className="flex flex-col gap-1">
        <label htmlFor="nomination-reason" className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Why? (optional)
        </label>
        <textarea
          id="nomination-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON_LENGTH}
          rows={2}
          placeholder="What have they done for the community this month?"
          className="w-full resize-none rounded-control border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
        />
      </div>

      <Button type="submit" size="sm" className="self-start" loading={submitting} disabled={!nominee || submitting}>
        {submitting ? "Submitting..." : "Submit nomination"}
      </Button>
    </form>
  );
}
