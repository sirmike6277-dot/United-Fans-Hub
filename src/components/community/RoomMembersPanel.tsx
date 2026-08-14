"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "./CommunityIcons";
import { KickIcon, BanIcon, ShieldIcon } from "./RoomIcons";
import {
  fetchRoomMembers,
  fetchRoomBans,
  kickMember,
  banMember,
  unbanMember,
  type RoomMember,
  type RoomBan,
} from "@/lib/community/rooms";

export interface RoomMembersPanelProps {
  conversationId: string;
  currentUserId: string;
  canModerate: boolean;
  onClose: () => void;
}

const SUSPEND_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "Permanent", hours: null },
];

interface PendingAction {
  profileId: string;
  name: string;
  type: "kick" | "suspend" | "unban";
  /** Only set for type "suspend" — null means permanent. */
  hours?: number | null;
}

/**
 * Moderation drawer for a room's admins/moderators/super_admin — only ever
 * rendered by RoomChat when `canModerate` is true, but the real boundary is
 * still the database: kickMember/banMember call the exact policies added in
 * migration 024 (the DELETE/INSERT predicates), which reject the same call
 * for anyone else regardless of what this UI shows.
 *
 * Kick and suspend are both destructive and previously fired on a single
 * click — Phase 16 adds a required confirmation step for both (see
 * `pendingAction`), naming the target and the exact consequence before
 * anything is sent to the server. Unban/lift-suspension is reversible (the
 * moderator can always re-suspend) but still gets the same named-target
 * confirmation, since it's still a one-click action a moderator could
 * trigger by mistake while scanning the list. Nothing about the underlying
 * kickMember/banMember/unbanMember calls or their authorization changed.
 */
export function RoomMembersPanel({ conversationId, currentUserId, canModerate, onClose }: RoomMembersPanelProps) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [bans, setBans] = useState<RoomBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the panel (mirrors the mobile Navbar menu's own
  // Escape-to-close convention); focus starts on the close button so a
  // keyboard user lands somewhere reachable without hunting for it.
  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([
      fetchRoomMembers(supabase, conversationId),
      canModerate ? fetchRoomBans(supabase, conversationId) : Promise.resolve({ bans: [], error: null }),
    ]).then(([memberResult, banResult]) => {
      if (!active) return;
      setLoading(false);
      if (memberResult.error) {
        setError(memberResult.error);
        return;
      }
      setMembers(memberResult.members);
      setBans(banResult.bans);
    });
    return () => {
      active = false;
    };
  }, [conversationId, canModerate]);

  function cancelPending() {
    setPendingAction(null);
  }

  async function confirmKick(targetProfileId: string) {
    setActioningId(targetProfileId);
    const supabase = createClient();
    const { error: kickError } = await kickMember(supabase, { conversationId, targetProfileId });
    setActioningId(null);
    setPendingAction(null);
    if (kickError) {
      setError(kickError);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.profileId !== targetProfileId));
  }

  async function confirmSuspend(targetProfileId: string, hours: number | null) {
    setActioningId(targetProfileId);
    const supabase = createClient();
    const bannedUntil = hours ? new Date(new Date().getTime() + hours * 60 * 60 * 1000).toISOString() : null;
    const { error: banError } = await banMember(supabase, {
      conversationId,
      targetProfileId,
      bannedBy: currentUserId,
      bannedUntil,
      reason: null,
    });
    setActioningId(null);
    setPendingAction(null);
    if (banError) {
      setError(banError);
      return;
    }
    const kicked = members.find((m) => m.profileId === targetProfileId);
    setMembers((prev) => prev.filter((m) => m.profileId !== targetProfileId));
    if (kicked) {
      setBans((prev) => [
        { profileId: targetProfileId, bannedAt: new Date().toISOString(), bannedUntil, reason: null, profile: kicked.profile },
        ...prev,
      ]);
    }
  }

  async function confirmUnban(targetProfileId: string) {
    setActioningId(targetProfileId);
    const supabase = createClient();
    const { error: unbanError } = await unbanMember(supabase, { conversationId, targetProfileId });
    setActioningId(null);
    setPendingAction(null);
    if (unbanError) {
      setError(unbanError);
      return;
    }
    setBans((prev) => prev.filter((b) => b.profileId !== targetProfileId));
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Room members" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-card border border-ink/10 bg-bg-surface shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-ink/10 p-4">
          <h2 className="font-display text-lg font-bold text-red-primary">Room Members</h2>
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

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <p className="mb-3 text-sm text-red-hover">{error}</p> : null}

          {loading ? (
            <div className="flex flex-col gap-3" aria-live="polite" aria-label="Loading members">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-control bg-ink/5" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const name = member.profile.display_name || member.profile.username;
                const isSelf = member.profileId === currentUserId;
                const pending = pendingAction?.profileId === member.profileId ? pendingAction : null;
                const isActioning = actioningId === member.profileId;

                return (
                  <div key={member.profileId} className="rounded-control bg-bg-elevated p-2.5">
                    <div className="flex items-center gap-2.5">
                      <Link href={`/profile/${member.profileId}`} className="shrink-0">
                        <Avatar url={member.profile.avatar_url} name={name} size={36} />
                      </Link>
                      <Link href={`/profile/${member.profileId}`} className="min-w-0 flex-1 hover:underline">
                        <p className="truncate text-sm font-medium text-ink">{name}</p>
                        <p className="truncate text-xs text-text-muted">@{member.profile.username}</p>
                      </Link>
                      {member.role === "admin" ? (
                        <Badge tone="outline" className="!px-1.5 !py-0 shrink-0 text-[10px]">
                          <ShieldIcon size={11} /> Admin
                        </Badge>
                      ) : null}
                      {!isSelf && canModerate ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSuspendTargetId(null);
                              setPendingAction({ profileId: member.profileId, name, type: "kick" });
                            }}
                            disabled={isActioning}
                            aria-label={`Remove ${name} from the room`}
                            title="Remove from room"
                            className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink disabled:opacity-40"
                          >
                            <KickIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingAction(null);
                              setSuspendTargetId(suspendTargetId === member.profileId ? null : member.profileId);
                            }}
                            disabled={isActioning}
                            aria-label={`Suspend ${name} from the room`}
                            title="Suspend from room"
                            className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:text-red-hover disabled:opacity-40"
                          >
                            <BanIcon />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {suspendTargetId === member.profileId && !pending ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink/10 pt-2">
                        {SUSPEND_OPTIONS.map((opt) => (
                          <Button
                            key={opt.label}
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSuspendTargetId(null);
                              setPendingAction({ profileId: member.profileId, name, type: "suspend", hours: opt.hours });
                            }}
                            disabled={isActioning}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    {pending ? (
                      <div
                        role="alertdialog"
                        aria-label={`Confirm ${pending.type === "kick" ? "removing" : "suspending"} ${name}`}
                        className="mt-2 flex flex-col gap-2 rounded-control border border-red-primary/30 bg-red-primary/[0.06] p-2.5"
                      >
                        <p className="text-xs text-text-body">
                          {pending.type === "kick" ? (
                            <>
                              Remove <span className="font-semibold text-ink">{name}</span> from this room? They can
                              rejoin immediately — this only ends their current membership.
                            </>
                          ) : pending.hours === null ? (
                            <>
                              <span className="font-semibold text-ink">Permanently</span> suspend{" "}
                              <span className="font-semibold text-ink">{name}</span> from this room? They will{" "}
                              <span className="font-semibold text-ink">not be able to rejoin</span> unless a
                              moderator lifts the suspension.
                            </>
                          ) : (
                            <>
                              Suspend <span className="font-semibold text-ink">{name}</span> from this room for{" "}
                              <span className="font-semibold text-ink">
                                {SUSPEND_OPTIONS.find((o) => o.hours === pending.hours)?.label}
                              </span>
                              ? They won&apos;t be able to rejoin until the suspension lifts.
                            </>
                          )}
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={cancelPending} disabled={isActioning}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            loading={isActioning}
                            disabled={isActioning}
                            onClick={() =>
                              pending.type === "kick"
                                ? confirmKick(pending.profileId)
                                : confirmSuspend(pending.profileId, pending.hours ?? null)
                            }
                          >
                            {isActioning ? "Working..." : pending.type === "kick" ? "Remove" : "Suspend"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && bans.length > 0 ? (
            <div className="mt-5 border-t border-ink/10 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Suspended</p>
              <div className="flex flex-col gap-2">
                {bans.map((ban) => {
                  const name = ban.profile.display_name || ban.profile.username;
                  const pendingUnban = pendingAction?.profileId === ban.profileId && pendingAction.type === "unban";
                  const isActioning = actioningId === ban.profileId;
                  return (
                    <div key={ban.profileId} className="rounded-control bg-bg-elevated p-2.5">
                      <div className="flex items-center gap-2.5">
                        <Link href={`/profile/${ban.profileId}`} className="shrink-0">
                          <Avatar url={ban.profile.avatar_url} name={name} size={32} />
                        </Link>
                        <Link href={`/profile/${ban.profileId}`} className="min-w-0 flex-1 hover:underline">
                          <p className="truncate text-sm font-medium text-ink">{name}</p>
                          <p className="truncate text-xs text-text-muted">
                            {ban.bannedUntil ? `Until ${new Date(ban.bannedUntil).toLocaleDateString()}` : "Permanent"}
                          </p>
                        </Link>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setPendingAction({ profileId: ban.profileId, name, type: "unban" })}
                          disabled={isActioning}
                        >
                          Lift
                        </Button>
                      </div>

                      {pendingUnban ? (
                        <div
                          role="alertdialog"
                          aria-label={`Confirm lifting ${name}'s suspension`}
                          className="mt-2 flex flex-col gap-2 rounded-control border border-ink/20 bg-ink/[0.04] p-2.5"
                        >
                          <p className="text-xs text-text-body">
                            Lift the suspension for <span className="font-semibold text-ink">{name}</span>? They
                            will be able to rejoin this room immediately.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={cancelPending} disabled={isActioning}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              loading={isActioning}
                              disabled={isActioning}
                              onClick={() => confirmUnban(ban.profileId)}
                            >
                              {isActioning ? "Working..." : "Lift suspension"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
