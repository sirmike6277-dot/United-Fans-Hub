"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { castVote, closePoll, isPollOpen, type RoomPoll } from "@/lib/community/polls";

export interface PollCardProps {
  poll: RoomPoll;
  currentUserId: string;
  canModerate: boolean;
  onChange: (poll: RoomPoll) => void;
}

/** CREATE POLL → VOTE → CONFIRM VOTE → SEE RESULTS → POLL CLOSES → FINAL RESULTS, all in one card. Vote casting is instant (no separate confirm step — a poll vote is reversible by voting again while open, unlike a room kick/suspend), but closing a poll gets an inline confirm since it's irreversible for everyone in the room. */
export function PollCard({ poll, currentUserId, canModerate, onChange }: PollCardProps) {
  const [voting, setVoting] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = isPollOpen(poll);
  const canClose = canModerate || poll.createdBy === currentUserId;

  async function handleVote(optionId: string) {
    if (!open || voting) return;
    setVoting(optionId);
    setError(null);
    const supabase = createClient();
    const { error: voteError } = await castVote(supabase, { pollId: poll.id, optionId, profileId: currentUserId });
    setVoting(null);

    if (voteError) {
      setError(voteError);
      return;
    }

    const options = poll.options.map((o) => {
      if (o.id === optionId) return { ...o, votes: o.votes + (poll.myOptionId === optionId ? 0 : 1) };
      if (o.id === poll.myOptionId) return { ...o, votes: Math.max(0, o.votes - 1) };
      return o;
    });
    onChange({ ...poll, options, myOptionId: optionId, totalVotes: options.reduce((s, o) => s + o.votes, 0) });
  }

  async function handleClose() {
    setClosing(true);
    const supabase = createClient();
    const { error: closeError } = await closePoll(supabase, poll.id);
    setClosing(false);
    setConfirmingClose(false);

    if (closeError) {
      setError(closeError);
      return;
    }
    onChange({ ...poll, closedAt: new Date().toISOString() });
  }

  return (
    <Card className="!p-4 flex flex-col gap-3 sm:!p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display font-semibold text-white">{poll.question}</p>
        {!open ? (
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Closed
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const percent = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
          const isMine = poll.myOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleVote(option.id)}
              disabled={!open || voting !== null}
              aria-pressed={isMine}
              className={`relative overflow-hidden rounded-control border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                isMine ? "border-red-primary/50" : "border-white/10"
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 ${isMine ? "bg-red-primary/25" : "bg-white/10"}`}
                style={{ width: `${percent}%` }}
                aria-hidden="true"
              />
              <span className="relative z-10 flex items-center justify-between gap-2">
                <span className={isMine ? "font-medium text-white" : "text-text-body"}>{option.label}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {percent}% ({option.votes.toLocaleString()})
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="text-xs text-red-hover">{error}</p> : null}

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {poll.totalVotes.toLocaleString()} {poll.totalVotes === 1 ? "vote" : "votes"}
        </span>
        {open && canClose ? (
          confirmingClose ? (
            <span className="flex items-center gap-2">
              <span>Close poll? Voting will end for everyone.</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingClose(false)} disabled={closing}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleClose} loading={closing} disabled={closing}>
                Close
              </Button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmingClose(true)} className="text-text-muted transition-colors hover:text-white">
              Close poll
            </button>
          )
        ) : null}
      </div>
    </Card>
  );
}
