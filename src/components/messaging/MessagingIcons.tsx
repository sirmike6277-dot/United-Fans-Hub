/** Inline SVG glyphs for messaging — matches the convention in community/CommunityIcons.tsx and notifications/NotificationIcons.tsx. Send/image/close icons are reused from CommunityIcons rather than duplicated. */

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

export function MessageBubbleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M4 5h16v11H9l-4 4v-4H4V5Z" />
    </svg>
  );
}

export function BackIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}
