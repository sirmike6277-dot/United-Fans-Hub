/**
 * Leading field-type glyphs for auth inputs — plain inline SVG (no icon
 * library dependency), matching the muted line-icon treatment in the
 * reference designs.
 */

function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function PersonIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.5 4-5.5 7.5-5.5s6.3 2 7.5 5.5" />
    </svg>
  );
}

export function UsernameIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.9-2.8 3-4.5 6-4.5s5.1 1.7 6 4.5" />
      <path d="M16 8.5c1.4.3 2.4 1.1 3 2.5M17 14c1.7.5 2.9 1.7 3.5 3.5" />
    </svg>
  );
}

export function EmailIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="4.5" y="11" width="15" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}
