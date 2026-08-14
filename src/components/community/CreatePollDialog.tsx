"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { CloseIcon } from "./CommunityIcons";
import { createPoll, fetchRoomPolls } from "@/lib/community/polls";
import type { RoomPoll } from "@/lib/community/polls";

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

export interface CreatePollDialogProps {
  conversationId: string;
  currentUserId: string;
  onCreated: (poll: RoomPoll) => void;
  onClose: () => void;
}

/**
 * CREATE POLL — only rendered by RoomPollsPanel for a moderator/admin
 * (`canModerate`); the real boundary is still the `room_polls` INSERT
 * policy itself (migration 034, tightened in Phase 17 from the original
 * "any participant" rule), which rejects this exact same call for anyone
 * else regardless of what the UI shows. Closing a poll uses a separately
 * broader rule (creator OR room admin/moderator, migration 027) — someone
 * who could never open this dialog can still close a poll they made before
 * they were promoted, which is intentional.
 */
export function CreatePollDialog({ conversationId, currentUserId, onCreated, onClose }: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= MIN_OPTIONS;

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { pollId, error: createError } = await createPoll(supabase, {
      conversationId,
      createdBy: currentUserId,
      question: question.trim(),
      options: trimmedOptions,
    });

    if (createError || !pollId) {
      setSubmitting(false);
      setError(createError ?? "Couldn't create the poll.");
      return;
    }

    const { polls } = await fetchRoomPolls(supabase, { conversationId, currentUserId });
    setSubmitting(false);

    const created = polls.find((p) => p.id === pollId);
    if (created) onCreated(created);
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Create a poll" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-card border border-ink/10 bg-bg-surface p-5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-red-primary">Create a Poll</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {error ? <FormError message={error} /> : null}

          <Input
            label="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            disabled={submitting}
            autoFocus
            placeholder="e.g. Who should start up front Saturday?"
            required
          />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-text-muted">Options</label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  maxLength={100}
                  disabled={submitting}
                  aria-label={`Option ${index + 1}`}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                {options.length > MIN_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={submitting}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink disabled:opacity-40"
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </div>
            ))}
            {options.length < MAX_OPTIONS ? (
              <Button type="button" variant="ghost" size="sm" onClick={addOption} disabled={submitting} className="self-start">
                + Add option
              </Button>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting} disabled={!canSubmit || submitting}>
              {submitting ? "Creating..." : "Create Poll"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
