/** Inline SVG glyphs for notifications — matches the convention in community/CommunityIcons.tsx, no icon library dependency. */

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

export function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps()}>
      <path d="M6 8a6 6 0 1 1 12 0c0 3.2 1 5 1.6 6H4.4C5 13 6 11.2 6 8Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

export function DoubleCheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...iconProps(2)}>
      <path d="M2 12.5 6 16 12 9" />
      <path d="M9 12.5 13 16 22 6" />
    </svg>
  );
}
