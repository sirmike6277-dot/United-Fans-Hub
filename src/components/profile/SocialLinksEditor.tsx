"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/community/CommunityIcons";
import {
  fetchSocialLinks,
  upsertSocialLink,
  deleteSocialLink,
  SOCIAL_PLATFORMS,
  PLATFORM_LABELS,
  type SocialLink,
  type SocialPlatform,
} from "@/lib/profile/socialLinks";

export interface SocialLinksEditorProps {
  profileId: string;
  initialLinks: SocialLink[];
}

/**
 * The first UI ever built against `social_links` (schema has existed since
 * early in the project, unused). One row per platform (matches the table's
 * own unique constraint) — adding a platform that's already linked edits
 * it in place rather than creating a duplicate.
 */
export function SocialLinksEditor({ profileId, initialLinks }: SocialLinksEditorProps) {
  const [links, setLinks] = useState(initialLinks);
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !links.some((l) => l.platform === p));

  async function handleAdd() {
    const trimmed = handle.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: saveError } = await upsertSocialLink(supabase, { profileId, platform, handleOrUrl: trimmed });
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    const { links: refreshed } = { links: await fetchSocialLinks(supabase, profileId) };
    setLinks(refreshed);
    setHandle("");
    setPlatform(availablePlatforms.find((p) => p !== platform) ?? platform);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error: removeError } = await deleteSocialLink(supabase, id);
    setRemovingId(null);

    if (removeError) {
      setError(removeError);
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium uppercase tracking-wide text-text-muted">Social Links</label>

      {links.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-3 rounded-control border border-ink/10 bg-bg-elevated px-4 py-2.5"
            >
              <span className="min-w-0 truncate text-sm text-ink">
                <span className="text-text-muted">{PLATFORM_LABELS[link.platform]}:</span> {link.handleOrUrl}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(link.id)}
                disabled={removingId === link.id}
                aria-label={`Remove ${PLATFORM_LABELS[link.platform]} link`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-red-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">No social links added yet.</p>
      )}

      {error ? <p className="text-xs text-red-hover">{error}</p> : null}

      {availablePlatforms.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            disabled={saving}
            aria-label="Platform"
            className="sm:w-40"
          >
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </Select>
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={saving}
            placeholder="@handle or profile URL"
            aria-label="Handle or URL"
            className="flex-1"
          />
          <Button type="button" variant="secondary" size="md" onClick={handleAdd} disabled={!handle.trim() || saving} loading={saving}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
