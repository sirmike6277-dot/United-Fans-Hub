/**
 * Small, dependency-free relative-time formatting. Deliberately not pulling
 * in date-fns/dayjs for one function — the ranges we need (feed/comment
 * timestamps) are simple and stable.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.round((now - then) / 1000));

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

/**
 * Absolute date/time for fixtures — kickoff times need a fixed point in
 * time, not a relative "in 3 days" that keeps changing as the page sits
 * open. e.g. "Sat 15 Aug, 15:00".
 */
export function formatMatchDateTime(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const timePart = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

/**
 * "45'" or, when the provider reported real stoppage time for this event
 * (see sync.ts's `detail.minute_extra`), "45+2'" — never computed/guessed,
 * only ever the provider's own two numbers concatenated. Returns "—" for
 * a genuinely unset minute (shouldn't happen once synced, but never
 * renders blank).
 */
export function formatEventMinute(minute: number | null, minuteExtra?: number | null): string {
  if (minute === null) return "—";
  return minuteExtra ? `${minute}+${minuteExtra}'` : `${minute}'`;
}
