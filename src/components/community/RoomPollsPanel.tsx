"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "./CommunityIcons";
import { PlusIcon } from "./RoomIcons";
import { PollCard } from "./PollCard";
import { CreatePollDialog } from "./CreatePollDialog";
import { fetchRoomPolls, type RoomPoll } from "@/lib/community/polls";

export interface RoomPollsPanelProps {
  conversationId: string;
  currentUserId: string;
  canModerate: boolean;
  onClose: () => void;
}

// Vote totals can't be pushed via Realtime without exposing who voted for
// what (room_poll_votes' own RLS only lets a subscriber see their OWN vote
// row — see migration 033's comment) — this is a deliberate, disclosed
// substitute: a quiet periodic re-fetch of the same room_poll_results()
// aggregate the panel already reads on open, only while it's actually
// mounted. Not true push-realtime, but delivers the same "don't need a
// hard refresh" outcome the phase brief asks for.
const VOTE_TOTALS_REFRESH_MS = 15000;

/** CREATE POLL → VOTE → SEE RESULTS → POLL CLOSES → FINAL RESULTS, listed newest-first for the whole room. */
export function RoomPollsPanel({ conversationId, currentUserId, canModerate, onClose }: RoomPollsPanelProps) {
  const [polls, setPolls] = useState<RoomPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pollIdsRef = useRef(new Set<string>());

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const loadPolls = useCallback(async () => {
    const supabase = createClient();
    const { polls: loaded, error: fetchError } = await fetchRoomPolls(supabase, { conversationId, currentUserId });
    return { loaded, fetchError };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    let active = true;
    loadPolls().then(({ loaded, fetchError }) => {
      if (!active) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError);
        return;
      }
      pollIdsRef.current = new Set(loaded.map((p) => p.id));
      setPolls(loaded);
    });
    return () => {
      active = false;
    };
  }, [loadPolls]);

  // New polls appear live (Realtime — migration 033) without needing to
  // reopen the panel; vote totals get a quiet periodic re-fetch instead of
  // push updates, since room_poll_votes' own RLS keeps other members' votes
  // invisible to a live subscription (see the file-level comment above).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room-polls-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_polls", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as { id: string };
          if (pollIdsRef.current.has(row.id)) return;
          loadPolls().then(({ loaded }) => {
            pollIdsRef.current = new Set(loaded.map((p) => p.id));
            setPolls(loaded);
          });
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      loadPolls().then(({ loaded, fetchError }) => {
        if (fetchError) return;
        pollIdsRef.current = new Set(loaded.map((p) => p.id));
        setPolls(loaded);
      });
    }, VOTE_TOTALS_REFRESH_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [conversationId, loadPolls]);

  function handlePollChange(updated: RoomPoll) {
    pollIdsRef.current.add(updated.id);
    setPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handlePollCreated(created: RoomPoll) {
    pollIdsRef.current.add(created.id);
    setPolls((prev) => [created, ...prev]);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Room polls" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-card border border-ink/10 bg-bg-surface shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-ink/10 p-4">
          <h2 className="font-display text-lg font-bold text-red-primary">Polls</h2>
          <div className="flex items-center gap-1">
            {canModerate ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCreating(true)}>
                <PlusIcon />
                New
              </Button>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <p className="text-sm text-red-hover">{error}</p> : null}

          {loading ? (
            <div className="flex flex-col gap-3" aria-live="polite" aria-label="Loading polls">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-card bg-ink/5" />
              ))}
            </div>
          ) : polls.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              {canModerate ? "No polls yet — start one to get the room's opinion." : "No polls yet — check back once a moderator starts one."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {polls.map((poll) => (
                <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} canModerate={canModerate} onChange={handlePollChange} />
              ))}
            </div>
          )}
        </div>
      </div>

      {creating ? (
        <CreatePollDialog
          conversationId={conversationId}
          currentUserId={currentUserId}
          onCreated={handlePollCreated}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
