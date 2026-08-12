export interface PullQuoteProps {
  quote: string;
  attribution: string;
  className?: string;
  /** Larger size for hero/banner contexts vs. the default compact rail/card size. */
  size?: "default" | "lg";
}

/**
 * Shared "voice of a fan/legend" quote treatment — the italic editorial
 * face (Playfair Display, see layout.tsx) reserved specifically for this,
 * so it reads as a deliberate flourish rather than a second body font.
 * Previously only existed as one hand-rolled instance in AuthVisual; now
 * reused there and anywhere else a page earns a moment of voice (Match
 * Centre, Members, Community).
 */
export function PullQuote({ quote, attribution, className = "", size = "default" }: PullQuoteProps) {
  return (
    <blockquote className={`border-l-2 border-red-primary pl-5 ${className}`}>
      <p className={`font-quote leading-relaxed text-white ${size === "lg" ? "text-2xl sm:text-3xl" : "text-lg"}`}>
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-3 text-sm font-medium text-text-muted">— {attribution}</footer>
    </blockquote>
  );
}
