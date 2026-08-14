"use client";

import { useState } from "react";
import { ReportDialog } from "./ReportDialog";
import type { ReportTargetType } from "@/lib/moderation/reports";

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  currentUserId: string;
  /** Defaults to a plain text "Report" trigger; pass children to render a custom trigger (e.g. an icon button in a message's hover toolbar) while keeping the same dialog-open logic. */
  children?: React.ReactNode;
  className?: string;
  /** Required when `children` is an icon with no visible text — an icon-only button with no label is an accessibility bug, not an acceptable default. */
  ariaLabel?: string;
}

/**
 * Manages the open/closed state so every call site (message toolbars,
 * profile pages, room settings, poll cards, nomination cards) can just
 * drop this in without re-implementing dialog state each time — the same
 * "wrap the shared dialog behind a trivial trigger" shape as
 * JoinRoomButton wraps its own confirmation flow.
 */
export function ReportButton({ targetType, targetId, currentUserId, children, className, ariaLabel }: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? (children ? undefined : `Report this ${targetType}`)}
        title={children ? ariaLabel ?? `Report this ${targetType}` : undefined}
        className={className ?? "text-xs text-text-muted underline transition-colors hover:text-ink"}
      >
        {children ?? "Report"}
      </button>
      {open ? <ReportDialog targetType={targetType} targetId={targetId} currentUserId={currentUserId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
