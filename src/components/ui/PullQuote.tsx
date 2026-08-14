"use client";

import { useEffect, useState } from "react";
import type { LegendQuote } from "@/lib/quotes/legends";

export interface PullQuoteProps {
  /** The quotes to rotate through — one is enough (renders static, no timer/transition ever starts), several rotate automatically. */
  quotes: LegendQuote[];
  className?: string;
  /** Larger size for hero/banner contexts vs. the default compact rail/card size. */
  size?: "default" | "lg";
  /**
   * "ink" (default): the quote sits on the app's own chrome surface (a
   * Card) — flips with the light/dark theme, same as any other body text.
   * "white": the quote is composited directly over a fixed dark photo
   * (SectionBanner's stadium-photo banners) — stays literal white
   * regardless of theme, since the photo underneath never lightens.
   */
  tone?: "ink" | "white";
  /** Milliseconds each quote holds before crossfading to the next. */
  intervalMs?: number;
}

const TRANSITION_MS = 450;

/**
 * Shared "voice of a legend" quote treatment — the italic editorial face
 * (Playfair Display, see layout.tsx) reserved specifically for this, so it
 * reads as a deliberate flourish rather than a second body font. Was one
 * hardcoded quote per call site (a real staleness problem — every visit to
 * e.g. Predictions showed the exact same Busby line forever); now rotates
 * through a real, attributed library of Manchester United legends (see
 * lib/quotes/legends.ts), each call site typically getting its own
 * deterministic subset via pickLegendQuotes so pages don't all cycle
 * through the identical four lines in lockstep.
 *
 * The crossfade (opacity + a small upward slide, both directions) is a
 * plain CSS transition — automatically honours this app's reduce-motion
 * setting for free, since globals.css already forces every
 * transition-duration to ~0 under `[data-reduce-motion="true"]` /
 * `prefers-reduced-motion: reduce`, no extra JS branch needed here.
 */
export function PullQuote({ quotes, className = "", size = "default", tone = "ink", intervalMs = 7000 }: PullQuoteProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (quotes.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length);
        setVisible(true);
      }, TRANSITION_MS);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [quotes.length, intervalMs]);

  const current = quotes[index % quotes.length];
  if (!current) return null;

  return (
    <blockquote className={`border-l-2 border-red-primary pl-5 ${className}`}>
      <div
        className="transition-all ease-out"
        style={{
          transitionDuration: `${TRANSITION_MS}ms`,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-6px)",
        }}
      >
        <p
          className={`font-quote leading-relaxed ${tone === "white" ? "text-white" : "text-ink"} ${size === "lg" ? "text-2xl sm:text-3xl" : "text-lg"}`}
        >
          &ldquo;{current.quote}&rdquo;
        </p>
        <footer className={`mt-3 text-sm font-medium ${tone === "white" ? "text-white/70" : "text-text-muted"}`}>
          — {current.attribution}
        </footer>
      </div>
    </blockquote>
  );
}
