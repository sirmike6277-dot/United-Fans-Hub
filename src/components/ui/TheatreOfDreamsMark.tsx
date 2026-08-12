export interface TheatreOfDreamsMarkProps {
  className?: string;
}

/**
 * The stadium's own nickname, set as a small carved-inscription mark
 * (Cinzel, see layout.tsx — not italic, not the pull-quote face) rather
 * than plain body text. Shared so the Hero and the auth pages' header
 * (AuthHeader) render the exact same treatment instead of two hand-tuned
 * copies drifting apart.
 */
export function TheatreOfDreamsMark({ className = "" }: TheatreOfDreamsMarkProps) {
  return (
    <p className={`font-theatre text-red-primary ${className}`} style={{ letterSpacing: "0.08em" }}>
      Theatre&nbsp;of&nbsp;Dreams
    </p>
  );
}
