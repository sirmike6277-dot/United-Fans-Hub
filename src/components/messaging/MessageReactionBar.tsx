"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleMessageReaction, MESSAGE_REACTION_EMOJIS, type MessageReactionSummary, type MessageReactionEmoji } from "@/lib/messaging/messages";

export interface MessageReactionBarProps {
  messageId: string;
  currentUserId: string;
  reactions: MessageReactionSummary[];
  onChange: (reactions: MessageReactionSummary[]) => void;
}

/**
 * Existing-reaction pills (with counts, highlighting the current user's
 * own) plus a picker for the fixed emoji set (see the CHECK constraint on
 * message_reactions.emoji). The picker renders as a centered, fixed-position
 * overlay rather than an anchored dropdown — a dropdown tucked to one edge
 * of a narrow chat bubble was what caused reactions to need horizontal
 * scrolling to see in full; a full-viewport-centered panel has room to lay
 * every emoji out in one clear grid regardless of where the message sits
 * on screen or how many emoji the set grows to.
 *
 * Every mutation is optimistic against the same reducer the Realtime path
 * would otherwise produce, then reconciled by whatever the server actually
 * accepts/rejects.
 */
export function MessageReactionBar({ messageId, currentUserId, reactions, onChange }: MessageReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const myReaction = reactions.find((r) => r.reactedByMe)?.emoji ?? null;

  // Escape closes the picker — same convention as RoomMembersPanel/
  // RoomPollsPanel's own full-screen overlays.
  useEffect(() => {
    if (!pickerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen]);

  async function handlePick(emoji: MessageReactionEmoji) {
    if (pending) return;
    setPending(true);
    setPickerOpen(false);

    const supabase = createClient();
    const { error } = await toggleMessageReaction(supabase, { messageId, profileId: currentUserId, emoji, currentEmoji: myReaction });
    setPending(false);
    if (error) return;

    const removing = myReaction === emoji;
    const next = reactions
      .map((r) => {
        if (r.emoji === emoji) return { ...r, count: r.count + (removing ? -1 : 1), reactedByMe: !removing };
        if (r.emoji === myReaction) return { ...r, count: Math.max(0, r.count - 1), reactedByMe: false };
        return r;
      })
      .filter((r) => r.count > 0);

    if (!removing && !next.some((r) => r.emoji === emoji)) {
      next.push({ emoji, count: 1, reactedByMe: true });
    }
    onChange(next);
  }

  return (
    <div className="relative flex max-w-full flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => handlePick(r.emoji as MessageReactionEmoji)}
          disabled={pending}
          aria-pressed={r.reactedByMe}
          aria-label={`${r.emoji} reaction, ${r.count} ${r.count === 1 ? "person" : "people"}${r.reactedByMe ? ", including you" : ""}`}
          className={`flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-colors disabled:opacity-60 ${
            r.reactedByMe ? "border-red-primary/50 bg-red-primary/15" : "border-ink/10 bg-ink/5 hover:border-ink/30"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="text-text-muted">{r.count}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={pending}
        aria-label="Add reaction"
        aria-expanded={pickerOpen}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/10 bg-ink/5 text-xs text-text-muted transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-60"
      >
        +
      </button>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="menu"
            aria-label="Choose a reaction"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-ink/10 bg-bg-elevated p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">React with</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-ink/10 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {MESSAGE_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(emoji)}
                  aria-label={`React with ${emoji}`}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-ink/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
