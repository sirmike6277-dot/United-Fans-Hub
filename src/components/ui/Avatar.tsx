import Image from "next/image";

export type AvatarCrown = "month" | "season" | null;

export interface AvatarProps {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
  /**
   * "month"/"season" draws a gold ring + crown badge — the current
   * reigning Fan of the Month/Season (see profiles.is_current_fan_of_month/
   * _season, migration 049), shown wherever this person's identity
   * appears: posts, comments, messages, rooms, the leaderboard, their own
   * profile. Omit/null renders exactly as before — this is purely additive.
   */
  crown?: AvatarCrown;
}

// Month's ring is a plain single-colour Tailwind `ring` utility. Season's
// two-tone (gold → purple glow) ring can't be expressed as one utility
// class, so it's built as an inline boxShadow directly where it's used
// below instead of living in this table.
const MONTH_RING = "ring-[#f2c14e]";

const SEASON_AURA_GRADIENT = "conic-gradient(from 0deg, #7c3aed, #f2c14e, #fde08a, #c9a5f2, #7c3aed)";

/**
 * The spinning gold/purple halo behind a Fan of the Season avatar — a
 * blurred, pulsing copy underneath a crisp rotating ring, both driven by
 * plain CSS `animation` (see globals.css for why that's enough to respect
 * reduced-motion with no extra handling here). Exported so ProfileView's
 * larger bespoke avatar can reuse the exact same effect at its own size,
 * rather than a second hand-tuned copy of these gradients.
 */
export function SeasonAura({ inset = -3 }: { inset?: number }) {
  return (
    <>
      <span
        className="season-aura-glow pointer-events-none absolute rounded-full blur-[10px]"
        style={{ inset, background: SEASON_AURA_GRADIENT }}
        aria-hidden="true"
      />
      <span
        className="season-aura pointer-events-none absolute rounded-full"
        style={{ inset, background: SEASON_AURA_GRADIENT }}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Gold (month) or ornate two-tone royal purple/gold (season) crown, sized
 * relative to the avatar it's pinned to. Season's is deliberately a
 * different, more ornate silhouette (a peaked centre + a small finial
 * jewel on top, like a real coronation crown) rather than just the same
 * shape recoloured — the thing that should read as "the rare one" even
 * before anyone registers the colour.
 */
export function CrownIcon({ size, season }: { size: number; season: boolean }) {
  const gradientId = `crownGradientSeason-${size}`;
  if (!season) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#f2c14e" stroke="#8b5e00" strokeWidth={0.75} strokeLinejoin="round" aria-hidden="true">
        <path d="M4 17h16l-1.4-7-4.1 3.2L12 8l-2.5 5.2L5.4 10 4 17Z" />
        <path d="M4 20h16" strokeWidth={1.5} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="season-shimmer-drop" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde08a" />
          <stop offset="50%" stopColor="#c9a5f2" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M3 17.5h18l-1.6-8-4.6 3.6L12 6.5l-2.8 6.6-4.6-3.6L3 17.5Z"
        fill={`url(#${gradientId})`}
        stroke="#4c1d95"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <path d="M3 20.5h18" stroke={`url(#${gradientId})`} strokeWidth={1.5} />
      {/* Finial jewel on the centre peak + a small gem cluster along the
          base — the detail that reads as "a real crown", not a gold
          triangle, even at the small sizes this renders at throughout the
          app. */}
      <circle cx="12" cy="6.5" r="1.6" fill="#fff4d6" stroke="#4c1d95" strokeWidth={0.4} />
      <circle cx="7.5" cy="17.5" r="1" fill="#fde08a" />
      <circle cx="12" cy="17.5" r="1.2" fill="#fff4d6" />
      <circle cx="16.5" cy="17.5" r="1" fill="#fde08a" />
    </svg>
  );
}

/**
 * Circular avatar with an initials fallback — used anywhere a profile's
 * identity is shown outside the full /profile page itself (feed, comments).
 * Never fabricates a photo: no avatar_url means initials, always.
 */
export function Avatar({ url, name, size = 40, className = "", crown = null }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const crownLabel = crown === "season" ? "Fan of the Season" : crown === "month" ? "Fan of the Month" : null;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {/* Behind the avatar circle (DOM order = paint order here — see
          SeasonAura) so only a spinning ring peeks out around its edge. */}
      {crown === "season" ? <SeasonAura inset={-Math.max(2, Math.round(size * 0.08))} /> : null}
      <span
        title={crownLabel ?? undefined}
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-text-muted ${
          crown === "month" ? `ring-2 ring-offset-2 ring-offset-bg-surface ${MONTH_RING}` : ""
        } ${className}`}
        style={
          // Season gets a genuine two-tone ring (offset → gold → soft
          // purple glow) rather than Tailwind's single-colour `ring`
          // utility — the visible "this is the rarer one" cue at a glance,
          // even before the crown icon itself registers.
          crown === "season"
            ? { boxShadow: "0 0 0 2px var(--color-bg-surface), 0 0 0 4px #f2c14e, 0 0 9px 2px rgba(124,58,237,0.65)" }
            : undefined
        }
      >
        {url ? (
          <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span
            className="font-display font-semibold"
            style={{ fontSize: Math.max(12, size * 0.4) }}
            aria-hidden="true"
          >
            {initial}
          </span>
        )}
      </span>

      {crown ? (
        <span
          className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[70%] drop-shadow-sm"
          aria-hidden="true"
        >
          <CrownIcon size={Math.max(14, Math.round(size * 0.45))} season={crown === "season"} />
        </span>
      ) : null}
      {crownLabel ? <span className="sr-only">{crownLabel}</span> : null}
    </span>
  );
}

/** Derives which crown (if any) to show from a FeedAuthor-shaped profile — season takes precedence over month if somehow both were ever true at once (see determine_award_winner, which never actually sets both, but this keeps the UI decision in one place rather than repeated inline at every call site). */
export function crownFor(profile: { is_current_fan_of_month?: boolean; is_current_fan_of_season?: boolean } | null | undefined): AvatarCrown {
  if (!profile) return null;
  if (profile.is_current_fan_of_season) return "season";
  if (profile.is_current_fan_of_month) return "month";
  return null;
}
