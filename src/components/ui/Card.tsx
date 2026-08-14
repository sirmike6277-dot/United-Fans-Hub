import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  children: ReactNode;
}

/**
 * Base elevated surface used across the app — dark card over the void
 * background with a subtle hairline border (a glass-effect hint rather than
 * an actual blur, to keep it cheap and crisp). Pass `featured` for
 * highlighted content (Fan of the Month, live match) to add a red accent glow.
 */
export function Card({
  featured = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-card border border-ink/10 bg-bg-surface p-6 ${
        featured
          ? "shadow-[0_0_0_1px_rgba(218,41,28,0.4),0_24px_48px_-24px_rgba(218,41,28,0.35)]"
          : "shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
