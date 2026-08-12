/** Inline SVG glyphs for the feature cards — no icon library dependency. */

function iconProps() {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function CommunityIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.8-3 3-4.8 6-4.8s5.2 1.8 6 4.8" />
      <path d="M15 8.3a2.7 2.7 0 1 1 3 4.4" />
      <path d="M16 14.5c1.9.5 3.3 1.9 4 4.5" />
    </svg>
  );
}

export function PredictionsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 17l5-5 4 4 7-8" />
      <path d="M15 8h4v4" />
    </svg>
  );
}

export function RankingsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5c0 1.8 1.2 3.2 3 3.5" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5c0 1.8-1.2 3.2-3 3.5" />
      <path d="M12 14v3M9 20h6M9.5 20c0-1.7.9-2.6 2.5-3 1.6.4 2.5 1.3 2.5 3" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
