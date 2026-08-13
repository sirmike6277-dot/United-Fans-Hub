/** Inline SVG glyphs for Report/Block/Mute/moderation-queue UI — matches the convention in CommunityIcons.tsx/RoomIcons.tsx. */

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

export function FlagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M5 21V4a1 1 0 0 1 1-1h11l-2.5 4L19 11H6" />
    </svg>
  );
}

export function SlashCircleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function VolumeOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M17 9l4 4M21 9l-4 4" />
    </svg>
  );
}

export function InboxIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M5.5 5h13l2.5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-7Z" />
    </svg>
  );
}
