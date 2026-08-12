/** Icons for the six seeded badges (see migration 023) — one per `badges.key`, same stroke convention as every other icon file in the app. */

function iconProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function ShieldCheckIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  );
}

export function CrownIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 17h16l-1.4-7-4.1 3.2L12 8l-2.5 5.2L5.4 10 4 17Z" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function FlameIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3s-5 4.5-5 9.5a5 5 0 0 0 10 0c0-1.6-.8-2.7-1.5-3.5.2 1.4-.5 2.2-1.2 2.5C15 9.5 13.5 7 12 3Z" />
    </svg>
  );
}

export function CameraIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.3" />
    </svg>
  );
}

export function StarShieldIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m12 8.7.9 1.9 2.1.3-1.5 1.5.35 2.1L12 13.5l-1.85 1 .35-2.1-1.5-1.5 2.1-.3.9-1.9Z" />
    </svg>
  );
}

export function ShieldHeartIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6l-7-2.5Z" />
      <path d="M12 15s-2.6-1.6-2.6-3.4a1.6 1.6 0 0 1 2.6-1.2 1.6 1.6 0 0 1 2.6 1.2c0 1.8-2.6 3.4-2.6 3.4Z" />
    </svg>
  );
}

export const BADGE_ICONS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  match_predictor: ShieldCheckIcon,
  top_commenter: CrownIcon,
  on_a_streak: FlameIcon,
  content_creator: CameraIcon,
  united_loyal: StarShieldIcon,
  community_hero: ShieldHeartIcon,
};

/**
 * One signature colour per badge — a "Match Predictor" shield, a "Top
 * Commenter" crown, an "On A Streak" flame, etc. all reading as the same
 * uniform gold made every badge look interchangeable regardless of what it
 * was for. Tailwind hex values (not CSS vars) since these also drive
 * inline rgba() washes in AchievementCard.
 */
export const BADGE_COLORS: Record<string, string> = {
  match_predictor: "#e3382b", // brand red — the prediction game itself
  top_commenter: "#f2c14e", // gold — a crown
  on_a_streak: "#fb7a3c", // flame orange
  content_creator: "#38bdf8", // sky blue — media/creative
  united_loyal: "#a78bfa", // violet — tenure/prestige
  community_hero: "#fb7185", // rose — heart/community
};
