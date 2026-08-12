"use client";

import { useEffect } from "react";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";

// Re-declared here rather than imported from layout.tsx: global-error.tsx
// replaces the ENTIRE root layout (including <html>/<body>) when the root
// itself fails, per Next.js's own requirement — it must not depend on
// layout.tsx's component tree, since that's exactly what may be broken.
const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

/**
 * Last-resort fallback for an error thrown in the root layout itself (a
 * normal page/route error is caught by its own nearer error.tsx instead —
 * this only fires when nothing else could). Deliberately minimal: no
 * Navbar (it calls Supabase client methods and could itself throw), no
 * Brand/ClubEmblem (server-only, unusable from a forced Client Component),
 * a plain `<a>` instead of next/link for the home link (a real navigation,
 * not a client-side route transition, in case the router itself is what's
 * unhealthy). Never surfaces `error.message`/stack/digest to the user.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-6 bg-bg-void px-4 text-center text-text-body">
        <span className="font-display text-lg font-bold uppercase tracking-wide text-white">
          United <span className="text-red-primary">Fans Hub</span>
        </span>

        <div className="max-w-sm">
          <p className="font-display text-xl font-bold text-white">Something went wrong</p>
          <p className="mt-2 text-sm text-text-muted">
            The application ran into an unexpected problem. Reloading usually fixes it — if it keeps
            happening, please try again in a few minutes.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-red-primary px-6 font-display text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
            >
              Try again
            </button>
            {/* Real anchor, not next/link — a full navigation is the safer
                recovery path here, not a client-side route transition, in
                case the router itself is part of what's broken. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/30 px-6 font-display text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
