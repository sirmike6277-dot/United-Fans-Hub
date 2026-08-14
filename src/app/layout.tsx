import type { Metadata, Viewport } from "next";
import { Oswald, Inter, Playfair_Display, Cinzel } from "next/font/google";
import "./globals.css";

// Display face: bold, condensed, broadcast-style — headlines, scores, big stats.
const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Body face: clean, highly legible — everything else.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Editorial face: an italic serif reserved for pull-quotes and "voice of a
// fan/legend" moments (AuthVisual, match-programme-style banners) — never
// used for UI chrome or body copy, so it stays a deliberate flourish rather
// than a second competing body face.
const playfairDisplay = Playfair_Display({
  variable: "--font-quote",
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
});

// The one-off "Theatre of Dreams" mark — a carved, monumental serif (its
// letterforms are literally modelled on Roman stone inscriptions), used
// nowhere else. Deliberately not italic and not the same face as pull
// quotes (--font-quote): this is a stadium's nickname carved into a brand
// mark, not somebody's spoken words.
const cinzel = Cinzel({
  variable: "--font-theatre",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "United Fans Hub — More Than a Club. We Are a Family.",
  description:
    "An independent Manchester United supporters community. Connect. Predict. Debate. Celebrate.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

// Runs synchronously in <head>, before hydration — the standard no-FOUC
// technique (same idea as next-themes) applied by hand rather than adding a
// dependency. Reads the same "theme-mode" key resolveTheme.ts's
// readStoredThemeMode/writeStoredThemeMode mirror, and resolves "auto"
// using the same 06:00–18:00 local-clock rule as resolveTheme() — that rule
// is duplicated here deliberately: this script can't import a module, it
// has to be a self-contained string that runs before any JS bundle loads.
// Without this, the theme is only ever known after AppearanceEffect's async
// Supabase fetch resolves, which is the exact flash this exists to prevent.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var mode = window.localStorage.getItem("theme-mode");
    var resolved;
    if (mode === "light" || mode === "dark") {
      resolved = mode;
    } else {
      var hour = new Date().getHours();
      resolved = hour >= 6 && hour < 18 ? "light" : "dark";
    }
    if (resolved === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${oswald.variable} ${inter.variable} ${playfairDisplay.variable} ${cinzel.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg-void text-text-body">
        {children}
      </body>
    </html>
  );
}
