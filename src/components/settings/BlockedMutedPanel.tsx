"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { fetchMyBlocks, fetchMyMutes, removeBlock, removeMute, type BlockedOrMutedEntry } from "@/lib/moderation/blocks";

export interface BlockedMutedPanelProps {
  currentUserId: string;
}

function AccountList({
  entries,
  loading,
  error,
  emptyLabel,
  actionLabel,
  onAction,
  busyId,
}: {
  entries: BlockedOrMutedEntry[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  actionLabel: string;
  onAction: (profileId: string) => void;
  busyId: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-live="polite" aria-label="Loading">
        {[0, 1].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-control bg-ink/5" />
        ))}
      </div>
    );
  }
  if (error) return <p className="text-sm text-red-hover">{error}</p>;
  if (entries.length === 0) return <p className="py-6 text-center text-sm text-text-muted">{emptyLabel}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map(({ profile }) => {
        const name = profile.display_name || profile.username;
        return (
          <li key={profile.id} className="flex items-center gap-3 rounded-control bg-bg-elevated p-3">
            <Avatar url={profile.avatar_url} name={name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="truncate text-xs text-text-muted">@{profile.username}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => onAction(profile.id)} loading={busyId === profile.id} disabled={busyId !== null}>
              {actionLabel}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The "Privacy" settings tab's real content — was a permanent "Coming
 * soon" placeholder (SettingsShell.tsx's ComingSoonPanel); this phase gives
 * it genuine content rather than adding a whole new settings section. Two
 * lists, not one — Block and Mute stay visually and functionally distinct
 * here too (see ProfileActionsMenu's own doc comment on why), each with an
 * unblock/unmute action that fully restores normal visibility (verified
 * live — see the report).
 */
export function BlockedMutedPanel({ currentUserId }: BlockedMutedPanelProps) {
  const [blocks, setBlocks] = useState<BlockedOrMutedEntry[]>([]);
  const [mutes, setMutes] = useState<BlockedOrMutedEntry[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [loadingMutes, setLoadingMutes] = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [mutesError, setMutesError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    fetchMyBlocks(supabase, currentUserId).then(({ entries, error }) => {
      setLoadingBlocks(false);
      if (error) setBlocksError(error);
      else setBlocks(entries);
    });
    fetchMyMutes(supabase, currentUserId).then(({ entries, error }) => {
      setLoadingMutes(false);
      if (error) setMutesError(error);
      else setMutes(entries);
    });
  }, [currentUserId]);

  async function handleUnblock(blockedId: string) {
    setBusyId(blockedId);
    const supabase = createClient();
    const { error } = await removeBlock(supabase, { blockerId: currentUserId, blockedId });
    setBusyId(null);
    if (!error) setBlocks((prev) => prev.filter((b) => b.profile.id !== blockedId));
  }

  async function handleUnmute(mutedId: string) {
    setBusyId(mutedId);
    const supabase = createClient();
    const { error } = await removeMute(supabase, { muterId: currentUserId, mutedId });
    setBusyId(null);
    if (!error) setMutes((prev) => prev.filter((m) => m.profile.id !== mutedId));
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold uppercase text-red-primary">Privacy</h2>
      <p className="mt-1 text-sm text-text-muted">Manage who you&apos;ve blocked or muted.</p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "blocked",
              label: `Blocked${blocks.length > 0 ? ` (${blocks.length})` : ""}`,
              content: (
                <AccountList
                  entries={blocks}
                  loading={loadingBlocks}
                  error={blocksError}
                  emptyLabel="You haven't blocked anyone."
                  actionLabel="Unblock"
                  onAction={handleUnblock}
                  busyId={busyId}
                />
              ),
            },
            {
              key: "muted",
              label: `Muted${mutes.length > 0 ? ` (${mutes.length})` : ""}`,
              content: (
                <AccountList
                  entries={mutes}
                  loading={loadingMutes}
                  error={mutesError}
                  emptyLabel="You haven't muted anyone."
                  actionLabel="Unmute"
                  onAction={handleUnmute}
                  busyId={busyId}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
