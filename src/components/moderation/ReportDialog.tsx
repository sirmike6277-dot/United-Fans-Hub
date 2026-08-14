"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/auth/FormError";
import { useDialogFocusTrap } from "@/lib/a11y/useDialogFocusTrap";
import { createReport, REPORT_REASONS, REPORT_REASON_LABELS, type ReportTargetType } from "@/lib/moderation/reports";

export interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: string;
  currentUserId: string;
  onClose: () => void;
}

const MAX_DETAILS_LENGTH = 500;

/**
 * The one shared report flow — used from message context menus, profile
 * pages, room settings, poll cards, and nomination cards alike (see each
 * call site's own comment for why it's wired in there). Never
 * reimplemented per surface: every caller just renders
 * `<ReportDialog targetType targetId currentUserId onClose />` and nothing
 * else changes between contexts.
 *
 * No moderator-facing detail leaks here or anywhere a non-moderator can
 * reach — this dialog only ever writes a report; it never reads other
 * reports, reporter identities, or a target's report history back.
 *
 * First dialog in the app to use a real focus trap + focus restoration
 * (useDialogFocusTrap) — see that hook's own comment for why prior dialogs
 * (CreatePollDialog etc.) don't have one yet.
 */
export function ReportDialog({ targetType, targetId, currentUserId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(dialogRef, true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason || submitting) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: submitError } = await createReport(supabase, {
      reporterId: currentUserId,
      targetType,
      targetId,
      reason,
      details: details || null,
    });
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report"
        tabIndex={-1}
        className="w-full max-w-sm rounded-card border border-ink/10 bg-bg-surface p-5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] focus:outline-none"
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="font-display text-base font-semibold text-ink">Report submitted</p>
            <p className="text-sm text-text-muted">Thanks — our moderators will review it.</p>
            <Button type="button" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold text-red-primary">Report</h2>
            {error ? <FormError message={error} /> : null}

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Reason</legend>
              {REPORT_REASONS.map((value) => (
                <label key={value} className="flex items-center gap-2.5 text-sm text-text-body">
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="h-4 w-4 accent-red-primary"
                  />
                  {REPORT_REASON_LABELS[value]}
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col gap-1">
              <label htmlFor="report-details" className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Additional details (optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={MAX_DETAILS_LENGTH}
                rows={3}
                placeholder="Anything that helps a moderator understand the issue"
                className="w-full resize-none rounded-control border border-ink/10 bg-bg-elevated px-3 py-2 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" size="sm" loading={submitting} disabled={!reason || submitting}>
                {submitting ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
