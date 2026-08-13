/** Inline SVG glyphs for Match Centre — matches the icon convention already established in community/CommunityIcons.tsx, notifications/NotificationIcons.tsx, and messaging/MessagingIcons.tsx. */

function iconProps(strokeWidth = 1.75) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function YellowCardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" fill="#eab308" />
    </svg>
  );
}

export function RedCardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" fill="#da291c" />
    </svg>
  );
}

/**
 * Split yellow/red card — the real-world referee convention for a
 * dismissal via two yellows, distinct from a straight red (RedCardIcon).
 * Only ever shown when the provider's own event detail text actually says
 * "second yellow" (see PitchLineup's cardFromDetail) — never inferred or
 * guessed. Two plain (unclipped) rects rather than a clip-path — an SVG
 * `id` would collide the moment this icon renders more than once on the
 * same page, which a real match with several bookings easily can.
 */
export function SecondYellowCardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" fill="#da291c" />
      <rect x="6" y="3" width="6" height="18" fill="#eab308" />
    </svg>
  );
}

export function SubstitutionIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M7 10 3 6l4-4" />
      <path d="M3 6h11a4 4 0 0 1 4 4v1" />
      <path d="m17 14 4 4-4 4" />
      <path d="M21 18H10a4 4 0 0 1-4-4v-1" />
    </svg>
  );
}

/** Small red circle + down arrow — "subbed off" marker for a pitch chip, matching the reference design's substitution badges. */
export function SubOffBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#da291c" stroke="white" strokeWidth="1.5" />
      <path d="M12 6v9m0 0-4-4m4 4 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Small green circle + up arrow — "subbed on" marker, the mirror of SubOffBadge, used on the substitutes bench for whoever actually came on (per real substitution events) vs an unused sub. */
export function SubOnBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#22a55e" stroke="white" strokeWidth="1.5" />
      <path d="M12 18V9m0 0 4 4m-4-4-4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function VarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 10v4M12 10v4M16 10l-1.5 4h3L16 10Z" />
    </svg>
  );
}

export function WhistleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="8" cy="14" r="5" />
      <path d="M13 14h4a3 3 0 0 0 3-3V9h-3" />
    </svg>
  );
}

/** A real soccer ball — pentagon/hexagon panel seams, not a plain circle — used as the "vs" divider between two teams and anywhere else a match needs a football mark rather than a generic dot. */
export function SoccerBallIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" fill="white" stroke="currentColor" strokeWidth="1.25" />
      <g stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="currentColor">
        <path d="M12 7.1 15 9.3l-1.15 3.55H9.15L8 9.3Z" />
        <path d="M12 7.1 9.3 5.1M12 7.1l2.7-2" fill="none" />
        <path d="M13.85 12.85 17.3 12l1 3.35-2.7 2.15Z" fillOpacity="0" />
        <path d="M8 9.3 4.9 10.15M15 9.3l3.1.85" fill="none" />
        <path d="M9.15 12.85 5.7 12l-.9 3.4M14.85 12.85l3.45-.85.9 3.4" fill="none" />
        <path d="M9.15 12.85 10.6 17H13.4l1.45-4.15M10.6 17l-2.75 2.2M13.4 17l2.75 2.2" fill="none" />
      </g>
    </svg>
  );
}

/**
 * Own goal — visually distinct from a normal goal's plain floating
 * SoccerBallIcon (see PlayerChip): a red circular badge (matching the
 * "wrong team" warning weight of SubOffBadge/RedCardIcon) with a small
 * white ball inside, rather than the same white ball on its own. Never
 * confusable with a real goal for that player's own side.
 */
export function OwnGoalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#da291c" stroke="white" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill="white" />
      <path d="M12 8.3 13.9 9.7l-.7 2.2h-2.4l-.7-2.2Z" fill="#da291c" />
    </svg>
  );
}

export function LocationIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
