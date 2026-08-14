import type { HTMLAttributes, ReactNode } from "react";

type Tone = "red" | "neutral" | "outline";

const tones: Record<Tone, string> = {
  red: "bg-red-primary text-white",
  neutral: "bg-ink/10 text-text-body",
  outline: "border border-ink/20 text-text-muted",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

/** Small pill tag — the one place full-rounded shapes are used intentionally (badges/tags). */
export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
