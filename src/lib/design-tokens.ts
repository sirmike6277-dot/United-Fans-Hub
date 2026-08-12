/**
 * United Fans Hub — design tokens.
 *
 * Single TypeScript source of truth for values that need to exist outside CSS
 * (e.g. `<meta theme-color>`, inline SVG fills, chart colours in later phases).
 *
 * The canonical *styling* source of truth for Tailwind utilities is the
 * `@theme` block in `src/app/globals.css` — Tailwind v4 is CSS-first and reads
 * its palette from there. These two files describe the same brand palette and
 * must be kept in sync manually; the set is small and intentionally stable.
 */

export const colors = {
  bgVoid: "#050505", // page background
  bgSurface: "#0A0A0A", // elevated surface / cards
  bgElevated: "#111111", // nav, header, modals
  redPrimary: "#DA291C", // primary CTA, active states, accents
  redHover: "#E50914", // hover state on primary red
  redDeep: "#8B0000", // pressed state, destructive, deep accent
  white: "#FFFFFF", // headings / primary text
  textBody: "#F4F4F4", // body text
  textMuted: "#A1A1A1", // secondary text, placeholders, metadata
} as const;

export const radii = {
  control: "0.5rem", // 8px — buttons, inputs
  card: "0.875rem", // 14px — cards, media
} as const;

export const fonts = {
  display: "var(--font-display)",
  body: "var(--font-body)",
} as const;

export type ColorToken = keyof typeof colors;
