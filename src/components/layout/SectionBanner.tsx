import Image from "next/image";
import { PullQuote } from "@/components/ui/PullQuote";
import type { LegendQuote } from "@/lib/quotes/legends";

export interface SectionBannerProps {
  imageSrc: string;
  imageAlt: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  /** One or several — several rotate automatically (see PullQuote). */
  quotes?: LegendQuote[];
}

/**
 * Photo-backed page header — the same layered-gradient/vignette treatment
 * as the landing Hero and AuthVisual, reused for interior pages that were
 * previously just a plain <PageHeader> (text on flat black). Carries the
 * page's own <h1>, so callers should not also render <PageHeader> alongside
 * this. Real, licensed photography only (see public/images/stadium/README.md)
 * — never AI-generated, never a scraped/branded graphic.
 *
 * Every color here is deliberately literal (bg-cinema-*, text-white,
 * text-white/70), never a bg-void/bg-elevated/text-muted token — this
 * banner is used on pages the light theme legitimately applies to
 * (Community, Notifications) as well as pages it doesn't, and it must look
 * identical either way. A token-based background paired with hardcoded
 * white text is exactly the bug a real pass caught: the background would
 * flip light while the text stayed white, going straight to illegible.
 */
export function SectionBanner({ imageSrc, imageAlt, kicker, title, subtitle, quotes }: SectionBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-card border border-white/10 bg-cinema-elevated">
      <div className="absolute inset-0" aria-hidden="true">
        <Image src={imageSrc} alt={imageAlt} fill priority sizes="100vw" className="object-cover opacity-60" />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-cinema-void via-cinema-void/75 to-cinema-void/20"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(218,41,28,0.3),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[240px] flex-col justify-end gap-6 p-6 sm:min-h-[300px] sm:p-8">
        <div>
          {kicker ? (
            <span className="text-xs font-semibold uppercase tracking-widest text-red-primary">{kicker}</span>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-tight text-white sm:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">{subtitle}</p> : null}
        </div>
        {quotes && quotes.length > 0 ? <PullQuote quotes={quotes} className="max-w-md" tone="white" /> : null}
      </div>
    </section>
  );
}
