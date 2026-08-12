"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { PlusIcon } from "./RoomIcons";
import { CloseIcon } from "./CommunityIcons";
import { createRoom } from "@/lib/community/rooms";

const MAX_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;

export interface CreateRoomDialogProps {
  currentUserId: string;
}

/**
 * Moderator-only "Create Room" entry point. The button is only ever
 * rendered by the caller for a real moderator/super_admin (checked
 * server-side) — the actual authorization boundary is still the
 * `conversations` INSERT policy itself ("...moderators can create rooms"),
 * which rejects this exact same call for anyone else regardless of what
 * the UI shows.
 */
export function CreateRoomDialog({ currentUserId }: CreateRoomDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setName("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { slug, error: createError } = await createRoom(supabase, {
      name: trimmedName,
      description: description.trim() || null,
      createdBy: currentUserId,
    });

    setSubmitting(false);

    if (createError || !slug) {
      setError(createError ?? "Couldn't create the room. Please try again.");
      return;
    }

    close();
    router.push(`/community/rooms/${slug}`);
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Create Room
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a Fan Room"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded-card border border-white/10 bg-bg-surface p-5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Create a Fan Room</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {error ? <FormError message={error} /> : null}

          <Input
            label="Room name"
            placeholder="e.g. 🔴 Old Trafford Faithful"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            disabled={submitting}
            autoFocus
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="room-description">
              Description (optional)
            </label>
            <textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              disabled={submitting}
              rows={3}
              placeholder="What's this room for?"
              className="resize-none rounded-control border border-white/10 bg-bg-elevated px-4 py-3 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting} disabled={!name.trim() || submitting}>
              {submitting ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
