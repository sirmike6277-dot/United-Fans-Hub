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

const CROWN_RING: Record<Exclude<AvatarCrown, null>, string> = {
  month: "ring-[#f2c14e]",
  // Season is the more prestigious title — a richer, two-tone amber/red
  // ring instead of a second, differently-shaped crown icon; keeps this
  // component simple while still reading as "a step up" from Month at a
  // glance.
  season: "ring-[#f2c14e]",
};

/** Small gold crown, sized relative to the avatar it's pinned to. */
function CrownIcon({ size, season }: { size: number; season: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={season ? "url(#crownGradientSeason)" : "#f2c14e"}
      stroke="#8b5e00"
      strokeWidth={0.75}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {season ? (
        <defs>
          <linearGradient id="crownGradientSeason" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde08a" />
            <stop offset="100%" stopColor="#e3382b" />
          </linearGradient>
        </defs>
      ) : null}
      <path d="M4 17h16l-1.4-7-4.1 3.2L12 8l-2.5 5.2L5.4 10 4 17Z" />
      <path d="M4 20h16" strokeWidth={1.5} />
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
      <span
        title={crownLabel ?? undefined}
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-text-muted ${
          crown ? `ring-2 ring-offset-2 ring-offset-bg-surface ${CROWN_RING[crown]}` : ""
        } ${className}`}
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
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"
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
