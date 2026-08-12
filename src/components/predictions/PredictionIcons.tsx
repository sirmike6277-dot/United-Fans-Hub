/** Inline SVG glyphs for Predictions — matches the icon convention already established in community/CommunityIcons.tsx, messaging/MessagingIcons.tsx, and matches/MatchIcons.tsx. */

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

export function TrophyIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a2 2 0 0 0 2 4M16 5h3a2 2 0 0 1-2 4" />
      <path d="M10 15v2h4v-2M9 20h6" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
