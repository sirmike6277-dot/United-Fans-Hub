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
  deleteAwardWinner,
  deleteAwardPeriod,
  reassignAwardWinner,
  autoNominateForPeriod,
  type AwardCategory,
  type AwardPeriod,
  type AwardNomination,
  type AwardWinner,
} from "@/lib/awards/awards";

export interface AwardPeriodAdminPanelProps {
  category: AwardCategory;
  period: AwardPeriod | null;
  pendingNominations: AwardNomination[];
  /** Only used once `period.status === "announced"` — the "correct a mistake" controls (migration 050). */
  winner: AwardWinner | null;
  approvedNominations: AwardNomination[];
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
export function AwardPeriodAdminPanel({ category, period, pendingNominations, winner, approvedNominations, onChanged }: AwardPeriodAdminPanelProps) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDeletePeriod, setConfirmingDeletePeriod] = useState(false);
  const [deletingPeriod, setDeletingPeriod] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [autoNominating, setAutoNominating] = useState(false);
  const [autoNominateResult, setAutoNominateResult] = useState<string | null>(null);

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

  async function handleDeletePeriod() {
    if (!period || deletingPeriod) return;
    setDeletingPeriod(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await deleteAwardPeriod(supabase, period.id);
    setDeletingPeriod(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setConfirmingDeletePeriod(false);
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

  async function handleAutoNominate() {
    if (!period || autoNominating) return;
    setAutoNominating(true);
    setAutoNominateResult(null);
    setError(null);
    const supabase = createClient();
    const { inserted, error: autoError } = await autoNominateForPeriod(supabase, period.id);
    setAutoNominating(false);
    if (autoError) {
      setError(autoError);
      return;
    }
    setAutoNominateResult(
      inserted > 0
        ? `Added ${inserted} nominee${inserted === 1 ? "" : "s"} from this period's most engaged fans.`
        : "No newly-eligible fans to add — everyone with real engagement this period is already nominated.",
    );
    onChanged();
  }

  async function handleDeleteWinner() {
    if (!winner || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await deleteAwardWinner(supabase, winner.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setConfirmingDelete(false);
    setCorrecting(false);
    onChanged();
  }

  async function handleReassignWinner(event: FormEvent) {
    event.preventDefault();
    if (!winner || !reassignTo || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: reassignError } = await reassignAwardWinner(supabase, { winnerId: winner.id, newNominationId: reassignTo });
    setBusy(false);
    if (reassignError) {
      setError(reassignError);
      return;
    }
    setReassignTo("");
    setCorrecting(false);
    onChanged();
  }

  const createForm = (
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
  );

  if (!period) {
    return (
      <div className="rounded-card border border-dashed border-ink/15 p-4">
        {creating ? (
          createForm
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

      {/*
        Super-admin/award-manager escape hatches, available regardless of
        this period's status — a period stuck in any state (e.g. a test
        period) is always picked as "the" current one for its category
        (AwardsHub sorts by period_start desc), which otherwise silently
        blocks ever starting a real replacement.
      */}
      {creating ? (
        <div className="rounded-control border border-dashed border-ink/15 p-3">{createForm}</div>
      ) : confirmingDeletePeriod ? (
        <div className="flex flex-col gap-2 rounded-control border border-red-primary/30 bg-red-primary/5 p-3">
          <p className="text-sm text-ink">
            Delete <span className="font-semibold">{period.periodLabel}</span> entirely? This removes its nominations, votes, and winner (if
            announced) — the crown is cleared too. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDeletePeriod(false)} disabled={deletingPeriod}>
              Cancel
            </Button>
            <Button type="button" size="sm" loading={deletingPeriod} disabled={deletingPeriod} onClick={handleDeletePeriod} className="!bg-red-primary">
              Yes, delete period
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 border-b border-ink/10 pb-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(true)} className="text-text-muted">
            + Start another {category.name} period
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDeletePeriod(true)} className="text-red-hover">
            Delete this period
          </Button>
        </div>
      )}

      {period.status === "upcoming" || period.status === "nominations_open" ? (
        <div className="flex flex-col gap-2 border-b border-ink/10 pb-3">
          <Button type="button" variant="secondary" size="sm" onClick={handleAutoNominate} loading={autoNominating} disabled={autoNominating} className="self-start">
            Auto-select nominees from engagement
          </Button>
          {autoNominateResult ? <p className="text-xs text-text-muted">{autoNominateResult}</p> : null}
          {approvedNominations.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Approved nominees so far ({approvedNominations.length}) — not visible to voters until voting opens
              </p>
              <div className="flex flex-wrap gap-2">
                {approvedNominations.map((nomination) => {
                  const name = nomination.nominee.display_name || nomination.nominee.username;
                  return (
                    <span key={nomination.id} className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-bg-surface py-1 pl-1 pr-2.5 text-xs text-ink">
                      <Avatar url={nomination.nominee.avatar_url} name={name} size={18} />
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
      ) : period.status === "announced" && winner ? (
        <WinnerCorrectionControls
          winner={winner}
          approvedNominations={approvedNominations}
          correcting={correcting}
          confirmingDelete={confirmingDelete}
          reassignTo={reassignTo}
          busy={busy}
          onStartCorrecting={() => setCorrecting(true)}
          onCancelCorrecting={() => {
            setCorrecting(false);
            setConfirmingDelete(false);
            setReassignTo("");
          }}
          onReassignToChange={setReassignTo}
          onReassign={handleReassignWinner}
          onRequestDelete={() => setConfirmingDelete(true)}
          onCancelDelete={() => setConfirmingDelete(false)}
          onConfirmDelete={handleDeleteWinner}
        />
      ) : (
        <p className="text-xs text-text-muted">This period is complete.</p>
      )}
    </div>
  );
}

/**
 * "They announced the wrong person" — a manager's mistake-correction path
 * for an already-announced winner, distinct from the forward-only
 * NEXT_STATUS flow above. Reassign moves the crown + record to a different
 * already-approved nominee in the same period (real vote_count recomputed
 * server-side); Delete removes the winner row entirely and reopens the
 * period as 'closed' so "Determine winner" can be run again later. Both
 * call the migration 050 SECURITY DEFINER functions — this panel only
 * renders the buttons, the has_role() check inside each function is the
 * real authorization boundary.
 */
function WinnerCorrectionControls({
  winner,
  approvedNominations,
  correcting,
  confirmingDelete,
  reassignTo,
  busy,
  onStartCorrecting,
  onCancelCorrecting,
  onReassignToChange,
  onReassign,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  winner: AwardWinner;
  approvedNominations: AwardNomination[];
  correcting: boolean;
  confirmingDelete: boolean;
  reassignTo: string;
  busy: boolean;
  onStartCorrecting: () => void;
  onCancelCorrecting: () => void;
  onReassignToChange: (nominationId: string) => void;
  onReassign: (event: FormEvent) => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const otherNominees = approvedNominations.filter((n) => n.id !== winner.nomination.id);

  if (!correcting) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={onStartCorrecting} className="self-start text-text-muted">
        Announced the wrong fan?
      </Button>
    );
  }

  if (confirmingDelete) {
    return (
      <div className="flex flex-col gap-2 rounded-control border border-red-primary/30 bg-red-primary/5 p-3">
        <p className="text-sm text-ink">
          Remove <span className="font-semibold">{winner.nomination.nominee.display_name || winner.nomination.nominee.username}</span> as{" "}
          {winner.categoryName} and clear their crown? The period reopens as closed so a winner can be determined again.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancelDelete} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" loading={busy} disabled={busy} onClick={onConfirmDelete} className="!bg-red-primary">
            Yes, remove winner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-ink/10 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Correct the {winner.categoryName} winner</p>

      {otherNominees.length > 0 ? (
        <form onSubmit={onReassign} className="flex flex-col gap-2">
          <label htmlFor="reassign-nominee" className="text-xs text-text-muted">
            Reassign to a different approved nominee
          </label>
          <div className="flex gap-2">
            <select
              id="reassign-nominee"
              value={reassignTo}
              onChange={(e) => onReassignToChange(e.target.value)}
              className="min-w-0 flex-1 rounded-control border border-ink/15 bg-bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Choose a nominee…</option>
              {otherNominees.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nominee.display_name || n.nominee.username}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" loading={busy} disabled={busy || !reassignTo}>
              Reassign
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-text-muted">No other approved nominees to reassign to for this period.</p>
      )}

      <div className="flex items-center justify-between border-t border-ink/10 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancelCorrecting} disabled={busy}>
          Never mind
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onRequestDelete} disabled={busy}>
          Delete winner
        </Button>
      </div>
    </div>
  );
}
