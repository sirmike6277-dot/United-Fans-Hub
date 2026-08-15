"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { FormError } from "@/components/auth/FormError";
import { useDialogFocusTrap } from "@/lib/a11y/useDialogFocusTrap";

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Return an error message string to keep the dialog open and show it; return null/undefined on success (the caller is responsible for closing — same "caller owns visibility" pattern as ReportDialog's onClose). */
  onConfirm: () => Promise<string | null | undefined | void>;
  onClose: () => void;
}

/**
 * Generic destructive-action confirmation — the same dialog shell
 * ReportDialog.tsx already established (role="dialog", real focus trap +
 * restoration via useDialogFocusTrap, Escape-to-close, bg-black/70
 * backdrop), pulled out so post/comment/message delete don't each
 * reimplement it. Deliberately content-agnostic: the caller supplies the
 * copy and the actual mutation, this only owns the "are you sure" gate and
 * its own loading/error state.
 */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(dialogRef, true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (result) {
      setError(result);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-sm rounded-card border border-ink/10 bg-bg-surface p-5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] focus:outline-none"
      >
        <h2 className="font-display text-lg font-bold text-red-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-body">{message}</p>
        {error ? (
          <div className="mt-3">
            <FormError message={error} />
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" loading={pending} disabled={pending} onClick={handleConfirm}>
            {pending ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
