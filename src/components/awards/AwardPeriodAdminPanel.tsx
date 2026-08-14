"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import {
  createAwardPeriod,
  transitionPeriodStatus,
  reviewNomination,
  determineWinner,
  type AwardCategory,
  type AwardPeriod,
  type AwardNomination,
} from "@/lib/awards/awards";

export interface AwardPeriodAdminPanelProps {
  category: AwardCategory;
  period: AwardPeriod | null;
  pendingNominations: AwardNomination[];
  onChanged: () => void;
}

const NEXT_STATUS: Record<AwardPeriod["status"], AwardPeriod["status"] | null> = {
  upcoming: "nominations_open",
  nominations_open: "voting_open",
  voting_open: "closed",
  closed: "announced",
  announced: null,
};

const NEXT_LABEL: Record<string, string> = {
  nominations_open: "Open nominations",
  voting_open: "Open voting",
  closed: "Close voting",
  announced: "Determine winner",
};

/**
 * Moderator/admin-only controls — only ever rendered by AwardsHub when
 * `canManage` is true, but the real boundary is still the database: every
 * call here (createAwardPeriod/transitionPeriodStatus/reviewNomination)
 * hits the exact RLS policies tightened in migration 035, which reject the
 * same call for anyone else regardless of what this panel shows. "Closed →
 * Determine winner" specifically calls determine_award_winner() rather than
 * a plain status update, since that step also computes and records the
 * actual winner (migration 036) — a plain status flip alone would leave
 * award_winners empty.
 */
export function AwardPeriodAdminPanel({ category, period, pendingNominations, onChanged }: AwardPeriodAdminPanelProps) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!label || !start || !end || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: createError } = await createAwardPeriod(supabase, { categoryId: category.id, periodLabel: label, periodStart: start, periodEnd: end });
    setBusy(false);
    if (createError) {
      setError(createError);
      return;
    }
    setCreating(false);
    setLabel("");
    setStart("");
    setEnd("");
    onChanged();
  }

  async function handleAdvance() {
    if (!period || busy) return;
    const next = NEXT_STATUS[period.status];
    if (!next) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: advanceError } = next === "announced" ? await determineWinner(supabase, period.id) : await transitionPeriodStatus(supabase, { periodId: period.id, status: next });

    setBusy(false);
    if (advanceError) {
      setError(advanceError);
      return;
    }
    onChanged();
  }

  async function handleReview(nominationId: string, status: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: reviewError } = await reviewNomination(supabase, { nominationId, status });
    setBusy(false);
    if (reviewError) setError(reviewError);
    else onChanged();
  }

  if (!period) {
    return (
      <div className="rounded-card border border-dashed border-ink/15 p-4">
        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            {error ? <FormError message={error} /> : null}
            <Input id={`period-label-${category.key}`} label="Period label" placeholder="e.g. August 2026" value={label} onChange={(e) => setLabel(e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <Input id={`period-start-${category.key}`} label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
              <Input id={`period-end-${category.key}`} label="End date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={busy} disabled={busy}>
                Create period
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreating(true)}>
            Start a new {category.name} period
          </Button>
        )}
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[period.status];

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ink/10 bg-bg-elevated p-4">
      {error ? <FormError message={error} /> : null}

      {pendingNominations.length > 0 ? (
        <div className="flex flex-col gap-2 border-b border-ink/10 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Pending nominations ({pendingNominations.length})
          </p>
          {pendingNominations.map((nomination) => {
            const name = nomination.nominee.display_name || nomination.nominee.username;
            return (
              <div key={nomination.id} className="flex items-center gap-2.5">
                <Avatar url={nomination.nominee.avatar_url} name={name} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleReview(nomination.id, "rejected")} disabled={busy}>
                  Reject
                </Button>
                <Button type="button" size="sm" onClick={() => handleReview(nomination.id, "approved")} disabled={busy}>
                  Approve
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      {nextStatus ? (
        <Button type="button" variant="secondary" size="sm" onClick={handleAdvance} loading={busy} disabled={busy} className="self-start">
          {NEXT_LABEL[nextStatus]}
        </Button>
      ) : (
        <p className="text-xs text-text-muted">This period is complete.</p>
      )}
    </div>
  );
}
