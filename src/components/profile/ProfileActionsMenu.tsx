"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { SlashCircleIcon, VolumeOffIcon } from "@/components/moderation/ModerationIcons";
import { createBlock, removeBlock, createMute, removeMute } from "@/lib/moderation/blocks";

export interface ProfileActionsMenuProps {
  currentUserId: string;
  targetProfileId: string;
  targetName: string;
  initialIsBlocked: boolean;
  initialIsMuted: boolean;
}

/**
 * Block/Mute/Report for another member's profile — a small "..." menu
 * rather than three separate buttons crowding the profile header (which
 * already has Follow/Message). Deliberately distinct copy for Block vs
 * Mute (the brief's own explicit ask): Block explains it also stops DMs
 * and mentions between the two of you; Mute explains it's silent and only
 * affects your own feed. Block gets an inline confirmation (it changes
 * what the other person can do, not just what you see); Mute doesn't
 * (purely a one-way, fully reversible display preference).
 *
 * This is a transient popover, not a modal — no focus trap needed here
 * (see ReportDialog for the one true modal this phase adds); it still
 * closes on Escape and returns focus to its own trigger.
 */
export function ProfileActionsMenu({ currentUserId, targetProfileId, targetName, initialIsBlocked, initialIsMuted }: ProfileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [isMuted, setIsMuted] = useState(initialIsMuted);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirmingBlock(false);
        triggerRef.current?.focus();
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirmingBlock(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function handleToggleBlock() {
    setBusy(true);
    const supabase = createClient();
    if (isBlocked) {
      const { error } = await removeBlock(supabase, { blockerId: currentUserId, blockedId: targetProfileId });
      if (!error) setIsBlocked(false);
    } else {
      const { error } = await createBlock(supabase, { blockerId: currentUserId, blockedId: targetProfileId });
      if (!error) setIsBlocked(true);
    }
    setBusy(false);
    setConfirmingBlock(false);
    setOpen(false);
  }

  async function handleToggleMute() {
    setBusy(true);
    const supabase = createClient();
    if (isMuted) {
      const { error } = await removeMute(supabase, { muterId: currentUserId, mutedId: targetProfileId });
      if (!error) setIsMuted(false);
    } else {
      const { error } = await createMute(supabase, { muterId: currentUserId, mutedId: targetProfileId });
      if (!error) setIsMuted(true);
    }
    setBusy(false);
    setOpen(false);
  }

  if (currentUserId === targetProfileId) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 w-10 items-center justify-center rounded-control border border-ink/10 text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open ? (
        <div role="menu" aria-label={`Actions for ${targetName}`} className="absolute right-0 z-20 mt-2 w-64 rounded-control border border-ink/10 bg-bg-elevated p-1.5 shadow-lg">
          {confirmingBlock ? (
            <div className="flex flex-col gap-2 p-2">
              <p className="text-xs text-text-body">
                Block <span className="font-semibold text-ink">{targetName}</span>? They won&apos;t be able to message
                or mention you, and you won&apos;t see each other&apos;s messages in shared Fan Rooms.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingBlock(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={handleToggleBlock} loading={busy} disabled={busy}>
                  Block
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => (isBlocked ? handleToggleBlock() : setConfirmingBlock(true))}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm text-text-body transition-colors hover:bg-ink/5 disabled:opacity-50"
              >
                <SlashCircleIcon />
                <span className="flex-1">
                  <span className="block">{isBlocked ? "Unblock" : "Block"}</span>
                  <span className="block text-xs text-text-muted">
                    {isBlocked ? "Restore DMs, mentions, and shared room visibility" : "Stops DMs, mentions, and hides each other's room messages"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleToggleMute}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm text-text-body transition-colors hover:bg-ink/5 disabled:opacity-50"
              >
                <VolumeOffIcon />
                <span className="flex-1">
                  <span className="block">{isMuted ? "Unmute" : "Mute"}</span>
                  <span className="block text-xs text-text-muted">
                    {isMuted ? "Show their content in your feed again" : "Silently hide their content from your feed only"}
                  </span>
                </span>
              </button>
              <div className="my-1 border-t border-ink/10" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setReportOpen(true);
                }}
                className="flex w-full items-center rounded-control px-3 py-2.5 text-left text-sm text-red-hover transition-colors hover:bg-ink/5"
              >
                Report {targetName}
              </button>
            </>
          )}
        </div>
      ) : null}

      {reportOpen ? (
        <ReportDialog targetType="user" targetId={targetProfileId} currentUserId={currentUserId} onClose={() => setReportOpen(false)} />
      ) : null}
    </div>
  );
}
