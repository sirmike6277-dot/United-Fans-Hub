import type { ReactNode } from "react";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";

export interface AuthLayoutProps {
  /** Left-side cinematic visual — hidden below lg, see <AuthVisual />. */
  visual: ReactNode;
  /** Right-side panel content: <AuthHeader />, the form, <AuthFooter />. */
  children: ReactNode;
}

/**
 * Shared shell for /login, /signup, /forgot-password: a premium split-screen
 * on desktop (cinematic visual + dark auth panel) that collapses to a single
 * centered column on mobile, keeping a subtle version of the same red-glow
 * atmosphere rather than just hiding it outright.
 *
 * On desktop, <AuthBackdrop /> paints one full-bleed background behind both
 * columns before either is rendered, so the right-hand panel (previously
 * flat bg-bg-void with no imagery at all) shares the same photography +
 * emblem canvas as the left, blending together at the column seam instead
 * of the page reading as "half" designed.
 */
export function AuthLayout({ visual, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen bg-cinema-void lg:grid lg:grid-cols-[2fr_3fr]">
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        <AuthBackdrop
          leftSrc="/images/stadium/old-trafford-trinity-statue.jpg"
          rightSrc="/images/stadium/old-trafford-interior.jpg"
        />
      </div>

      <div className="relative hidden lg:block">{visual}</div>

      {/* Subtle mobile-only atmosphere — echoes the hero's red glow without the full visual */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(218,41,28,0.18),transparent_60%)] lg:hidden"
        aria-hidden="true"
      />

      <div className="relative flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="flex w-full max-w-sm flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}
