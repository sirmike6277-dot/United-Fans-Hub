import Image from "next/image";
import { PullQuote } from "@/components/ui/PullQuote";
import { pickLegendQuotes } from "@/lib/quotes/legends";

/**
 * Left-panel foreground content for the auth split-screen. The shared,
 * full-bleed background — Old Trafford photography blending into the
 * Manchester United emblem on the right — is rendered once by `AuthLayout`
 * via `AuthBackdrop`, so this component only supplies what sits on top of
 * it here: the badge, a second real Old Trafford photo in a framed card
 * (Larry RW, Unsplash License; see public/images/stadium/README.md), and
 * the pull quote.
 *
 * This app has no real, licensed individual player photography (see
 * public/images/players/README.md), so — as before — there's no player
 * photo slot here; real stadium photography fills that moment honestly
 * instead of an asset this project doesn't have the rights to.
 */
export function AuthVisual() {
  return (
    <div className="relative flex h-full min-h-screen flex-col justify-between p-12">
      <span className="max-w-xs font-display text-sm font-semibold uppercase tracking-widest text-text-muted">
        An independent Manchester United fan community
      </span>

      <div className="relative mx-auto h-[45vh] w-full max-w-md overflow-hidden rounded-card border border-ink/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
        <Image
          src="/images/stadium/old-trafford-reds-mural.jpg"
          alt="'THE REDS GO MARCHING ON' — the mural on Old Trafford's forecourt wall"
          fill
          priority
          sizes="(min-width: 1024px) 30vw, 90vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-cinema-void/80 via-transparent to-transparent"
          aria-hidden="true"
        />
      </div>

      <PullQuote quotes={pickLegendQuotes("auth-visual")} className="max-w-sm" />
    </div>
  );
}
