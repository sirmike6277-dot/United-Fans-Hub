"use client";

import { useState } from "react";
import Image from "next/image";

export interface TeamCrestProps {
  /** "manUtd" uses the real, locally-supplied licensed asset; "opponent" hotlinks the real crest live from API-Football's own CDN via `externalRef`. */
  variant: "manUtd" | "opponent";
  /** API-Football's numeric team id (`clubs.external_ref` / `matches.opponentExternalRef`) — required for variant="opponent"; ignored for "manUtd". */
  externalRef?: string | null;
  /** Real team name — used for alt text and the initials placeholder. */
  name: string;
  size?: number;
  className?: string;
}

const MAN_UTD_SRC = "/images/branding/manchester-united-emblem.webp";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Neutral, fixed-size placeholder — never a broken-image icon and never a fabricated crest, just this team's initials in a plain circle. */
function CrestPlaceholder({ name, size, className }: { name: string; size: number; className: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-bg-elevated text-text-muted ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name} crest`}
    >
      <span className="select-none font-display font-bold" style={{ fontSize: Math.max(9, size * 0.32) }} aria-hidden="true">
        {initials(name)}
      </span>
    </span>
  );
}

/**
 * One shared crest component for every surface that shows a club badge
 * against an opponent — Match Centre's pitch/score/fixture views. Two real
 * sources, never a fabricated one: Manchester United's own locally-shipped,
 * licensed asset for `variant="manUtd"`; any other club's real crest
 * hotlinked live from API-Football's CDN for `variant="opponent"`, keyed by
 * their real numeric team id (the same paid provider already used for
 * every match on this page).
 *
 * Always renders at a fixed `size` square, so a missing/failed image never
 * reflows whatever sits next to it — this is a client component
 * specifically so a real `onError` (a 404, a network failure, no id yet)
 * can swap to a neutral initials placeholder instead of leaving a broken-
 * image icon or an invisible empty gap.
 *
 * Deliberately separate from ClubEmblem (src/components/media/ClubEmblem.tsx)
 * — that component is this app's own site-wide brand mark (navbar, auth
 * screens, error pages, loading states) and stays exactly as-is; this one
 * is specifically for "our crest vs. their crest" match contexts.
 */
export function TeamCrest({ variant, externalRef, name, size = 32, className = "" }: TeamCrestProps) {
  const [failed, setFailed] = useState(false);

  const src =
    variant === "manUtd"
      ? MAN_UTD_SRC
      : externalRef && /^\d+$/.test(externalRef)
        ? `https://media.api-sports.io/football/teams/${externalRef}.png`
        : null;

  if (!src || failed) {
    return <CrestPlaceholder name={name} size={size} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={`${name} crest`}
      width={size}
      height={size}
      unoptimized={variant === "opponent"}
      onError={() => setFailed(true)}
      // Same specificity-vs-Tailwind-preflight fix as ClubEmblem/Avatar.
      style={{ width: size, height: size }}
      className={`select-none object-contain ${className}`}
    />
  );
}
