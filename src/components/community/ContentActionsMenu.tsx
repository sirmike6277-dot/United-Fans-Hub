"use client";

import { useEffect, useRef, useState } from "react";
import { PencilIcon, TrashIcon } from "./CommunityIcons";

export interface ContentActionsMenuProps {
  /** Omitted for media-only content with no text body to edit — Delete-only menu in that case. */
  onEdit?: () => void;
  onDelete: () => void;
  /** "post" | "comment" — only used for the trigger's accessible label. */
  label: string;
}

/**
 * The Edit/Delete "..." menu for a caller's own post or comment — same
 * transient-popover recipe as ProfileActionsMenu.tsx (trigger + role="menu"
 * dropdown, closes on Escape or an outside click, no focus trap needed
 * since it isn't a modal). Shared between PostCard and CommentItem rather
 * than reimplemented twice, since both offer the exact same two actions.
 * Messages use a different, already-established pattern instead (hover-
 * reveal icon buttons alongside Reply/Report — see MessageBubble.tsx) so
 * this component is community-only.
 */
export function ContentActionsMenu({ onEdit, onDelete, label }: ContentActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for this ${label}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open ? (
        <div role="menu" aria-label={`Actions for this ${label}`} className="absolute right-0 z-20 mt-2 w-40 rounded-control border border-ink/10 bg-bg-elevated p-1.5 shadow-lg">
          {onEdit ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-text-body transition-colors hover:bg-ink/5"
            >
              <PencilIcon />
              Edit
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-red-hover transition-colors hover:bg-ink/5"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
