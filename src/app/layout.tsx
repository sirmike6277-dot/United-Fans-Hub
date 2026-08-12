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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${inter.variable} ${playfairDisplay.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-void text-text-body">
        {children}
      </body>
    </html>
  );
}
