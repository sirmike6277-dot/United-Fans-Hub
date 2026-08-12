/** Inline SVG glyphs for the member directory — matches the convention in community/CommunityIcons.tsx, notifications/NotificationIcons.tsx, and messaging/MessagingIcons.tsx. */

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

export function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function UsersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 8.5a2.5 2.5 0 1 1 0 5" />
      <path d="M21 20c0-2.6-1.8-4.8-4.2-5.6" />
    </svg>
  );
}
