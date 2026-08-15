/**
 * FanHub brand palette — the single source of truth shared by both apps.
 * Mirrors src/lib/design-tokens.ts (web) and apps/mobile/tailwind.config.js
 * (mobile NativeWind theme). Keep all three in sync manually if the brand
 * palette ever changes.
 */
export const colors = {
  bgVoid: "#050505",
  bgSurface: "#0A0A0A",
  bgElevated: "#111111",
  redPrimary: "#DA291C",
  redHover: "#E50914",
  redDeep: "#8B0000",
  white: "#FFFFFF",
  textBody: "#F4F4F4",
  textMuted: "#A1A1A1",
} as const;

export type ColorToken = keyof typeof colors;
