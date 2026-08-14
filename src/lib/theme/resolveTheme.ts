export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// Local-clock day/night window for "auto" mode — deliberately the device's
// own clock, not real sunrise/sunset (which would need Geolocation
// permission and a sunrise/sunset calculation; a product decision to keep
// this dependency-free, not an oversight).
const LIGHT_START_HOUR = 6; // 06:00 local
const LIGHT_END_HOUR = 18; // 18:00 local

/**
 * Resolves a stored theme preference to the concrete theme actually
 * rendered. "light"/"dark" are an explicit manual override; "auto" follows
 * the local clock (light 06:00–18:00, dark otherwise). `now` is injectable
 * for testability — real callers omit it and get the live clock.
 */
export function resolveTheme(mode: ThemeMode, now: Date = new Date()): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  const hour = now.getHours();
  return hour >= LIGHT_START_HOUR && hour < LIGHT_END_HOUR ? "light" : "dark";
}

/**
 * Milliseconds until the next light/dark boundary crossing (06:00 or 18:00
 * local, whichever is soonest) — lets "auto" mode schedule exactly one
 * timer per crossing instead of polling on an interval.
 */
export function msUntilNextThemeBoundary(now: Date = new Date()): number {
  const next = new Date(now);
  if (now.getHours() < LIGHT_START_HOUR) {
    next.setHours(LIGHT_START_HOUR, 0, 0, 0);
  } else if (now.getHours() < LIGHT_END_HOUR) {
    next.setHours(LIGHT_END_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(LIGHT_START_HOUR, 0, 0, 0);
  }
  // Floor of 1s guards against a 0ms/negative timeout re-firing instantly
  // if `now` landed exactly on a boundary.
  return Math.max(1000, next.getTime() - now.getTime());
}

/** Applies (or clears) the `data-theme` attribute globals.css reads. No attribute = dark, the app's original/default palette in every sense — never an unstyled flash. */
export function applyThemeAttribute(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

// Device-local mirror of the theme preference, independent of any signed-in
// account. Two jobs: (1) lets the inline no-flash script in layout.tsx
// (which runs before React/Supabase are available) resolve the correct
// theme synchronously on first paint, and (2) is the only theme source at
// all for a signed-out visitor, who has no `profiles` row to read from.
// AppearanceEffect mirrors the real, account-scoped preference in here on
// every fetch, so the two stay in sync on any device the user has signed in
// on; a browser that's never seen a signed-in session just falls back to
// "auto" below, same as this app's own default.
const STORAGE_KEY = "theme-mode";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}

/** Reads the mirrored theme preference. SSR/private-browsing-safe — never throws, falls back to "auto". */
export function readStoredThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

/** Mirrors a theme preference for the next load's synchronous read. Best-effort — a write failure (e.g. private browsing) just means the next load falls back to "auto", never an error the user sees. */
export function writeStoredThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignored — see doc comment above.
  }
}
