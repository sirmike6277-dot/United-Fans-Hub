/**
 * FanHub mobile design tokens, mirroring src/lib/design-tokens.ts and the
 * @theme block in the web app's src/app/globals.css. Keep these two in sync
 * manually if the brand palette ever changes — same convention the web app
 * already follows.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-void": "#050505",
        "bg-surface": "#0A0A0A",
        "bg-elevated": "#111111",
        "red-primary": "#DA291C",
        "red-hover": "#E50914",
        "red-deep": "#8B0000",
        "text-body": "#F4F4F4",
        "text-muted": "#A1A1A1",
      },
      borderRadius: {
        control: "8px",
        card: "14px",
      },
    },
  },
  plugins: [],
};
