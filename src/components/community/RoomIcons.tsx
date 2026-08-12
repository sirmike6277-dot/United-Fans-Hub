/** Inline SVG glyphs for Fan Rooms — matches the convention in CommunityIcons.tsx/MessagingIcons.tsx. */

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

export function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    </svg>
  );
}

export function FileGenericIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function VideoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MoreIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function LeaveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function KickIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <circle cx="9" cy="7" r="3" />
      <path d="M2 20c0-3.3 2.7-6 6-6h2" />
      <path d="M17 8l4 4m0-4-4 4" />
    </svg>
  );
}

export function BanIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* Room-identity icons — one per theme in getRoomVisual (RoomVisual.tsx), so a room's own icon actually reflects what it's for instead of every room sharing one generic bubble. */

export function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function LaughIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14c.9 1.3 2 2 3.5 2s2.6-.7 3.5-2" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01" />
    </svg>
  );
}

export function SwapIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="m7 4 4 4-4 4" />
      <path d="M3 8h8" />
      <path d="m17 12 4 4-4 4" />
      <path d="M13 16h8" />
    </svg>
  );
}

export function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="m12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16.1 7.4 18.6l.9-5.3-3.8-3.7 5.2-.7Z" />
    </svg>
  );
}

export function WhistleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="8" cy="14" r="5" />
      <path d="M11.5 11 20 6.5V4h-3.5L11.8 8" />
      <path d="M8 14h0" />
    </svg>
  );
}

export function SproutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6Z" />
      <path d="M12 15c0-3.5-2.5-5-6-5 0 3.5 2.5 5 6 5Z" />
    </svg>
  );
}

export function PlayCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10 9 5 3-5 3Z" />
    </svg>
  );
}
