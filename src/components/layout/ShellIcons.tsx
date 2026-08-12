/**
 * Icons shared by the app shell (Navbar + Sidebar) that aren't specific to
 * any one feature area — matches the stroke-icon convention established by
 * every feature's own Icons file (24x24 viewBox, 1.75 stroke, round caps).
 */

export function HomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1H9.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

/** Feed/community — stacked speech bubbles, distinct from the single-bubble MessageBubbleIcon. */
export function CommunityIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 12.5a4.5 4.5 0 1 1 1.77 3.58L6.5 17l.8-2.62A4.47 4.47 0 0 1 8 12.5Z" />
      <path d="M15.5 6.5A4.5 4.5 0 0 1 20 11a4.47 4.47 0 0 1-.62 2.27" opacity="0.55" />
    </svg>
  );
}

/** Match Centre — a pitch/goal-mouth mark, distinct from the trophy used for Predictions. */
export function MatchCentreIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 12h17M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function GearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3" />
    </svg>
  );
}

export function ProfileIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 19.5c1.4-3.2 4.2-5 7.5-5s6.1 1.8 7.5 5" />
    </svg>
  );
}
