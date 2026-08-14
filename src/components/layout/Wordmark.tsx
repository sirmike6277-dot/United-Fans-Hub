import Link from "next/link";

/**
 * United Fans Hub product wordmark — the product's own identity, entirely
 * separate from the Manchester United emblem (see ClubEmblem). Text-based
 * until a designed logo file is supplied; swapping to an image asset later
 * only touches this component.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-lg font-bold uppercase tracking-wide text-ink ${className}`}
    >
      United <span className="text-red-primary">Fans Hub</span>
    </Link>
  );
}
