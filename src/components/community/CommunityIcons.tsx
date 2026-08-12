/** Inline SVG glyphs for the feed — matches the icon convention already established in landing/FeatureIcons.tsx, no icon library dependency. */

function iconProps(strokeWidth = 1.75) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 20.2 4.7 13.2C2.4 11 2.5 7.3 5 5.4c2.2-1.7 5.3-1.2 6.9.9L12 6.6l.1-.3c1.6-2.1 4.7-2.6 6.9-.9 2.5 1.9 2.6 5.6.3 7.8L12 20.2Z" />
      </svg>
    );
  }
  return (
    <svg {...iconProps()}>
      <path d="M12 20.2 4.7 13.2C2.4 11 2.5 7.3 5 5.4c2.2-1.7 5.3-1.2 6.9.9L12 6.6l.1-.3c1.6-2.1 4.7-2.6 6.9-.9 2.5 1.9 2.6 5.6.3 7.8L12 20.2Z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 5h16v11H9l-4 4v-4H4V5Z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M4 17.5 9 13l3 2.5 4.5-4.5 3.5 3.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M20 11A8 8 0 1 0 18.5 16" />
      <path d="M20 6v5h-5" />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M9 6 3 12l6 6M3 12h11a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
