import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-display font-semibold uppercase tracking-wide transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void";

const variants: Record<Variant, string> = {
  primary:
    "bg-red-primary text-white hover:bg-red-hover active:bg-red-deep",
  secondary:
    "bg-transparent text-ink border border-ink/30 hover:border-ink/60",
  ghost: "bg-transparent text-text-muted hover:text-ink",
  destructive: "bg-red-deep text-white hover:bg-red-primary",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

interface SharedProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export interface ButtonProps
  extends SharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps> {
  href?: undefined;
  loading?: boolean;
}

export interface ButtonLinkProps
  extends SharedProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedProps> {
  href: string;
}

/**
 * Renders a real `<button>` by default, or a Next.js `<Link>` styled
 * identically when `href` is passed — avoids ever nesting an `<a>` inside a
 * `<button>` for CTA links.
 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps | ButtonLinkProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonLinkProps;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { loading = false, disabled, ...buttonRest } = rest as ButtonProps;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
