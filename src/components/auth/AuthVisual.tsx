import Image from "next/image";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { PullQuote } from "@/components/ui/PullQuote";

/**
 * Left-panel cinematic visual for the auth split-screen — real Old Trafford
 * photography (Dan Parker / Larry RW, Unsplash License; see
 * public/images/stadium/README.md), subdued and blended under the same
 * layered-gradient treatment as the landing hero, plus the supplied crest as
 * a faded watermark. See Hero.tsx for the matching treatment.
 *
 * The mid-panel used to be a PlayerImage slot — this app has no real,
 * licensed individual player photography yet (see public/images/players/
 * README.md), so that slot permanently rendered a dashed "Photo pending"
 * box, the very first thing a signing-up visitor saw. A second real stadium
 * photo fills that moment honestly instead of waiting on an asset this
 * project doesn't have the rights to.
 *
 * Server-rendered only: ClubEmblem checks the filesystem for licensed
 * assets, which requires staying out of any "use client" tree.
 */
export function AuthVisual() {
  return (
    <div className="relative h-full min-h-screen overflow-hidden bg-bg-elevated">
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/stadium/old-trafford-trinity-statue.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-40"
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-bg-elevated/45 via-bg-void/75 to-bg-void"
        aria-hidden="true"
      />

      {/* Oversized emblem watermark — subtle, off-center, faded into the gradient */}
      <div className="pointer-events-none absolute -bottom-28 -left-28 opacity-[0.07]" aria-hidden="true">
        <ClubEmblem size={480} />
      </div>

      {/* Floodlight beam — a single soft diagonal shaft, echoing the landing hero */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: "conic-gradient(from 200deg at 25% -10%, rgba(255,255,255,0.06), transparent 22%)",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(218,41,28,0.25),transparent_55%)]"
        aria-hidden="true"
      />

      {/* Vignette — keeps the edges receding so the player/quote content stays the focal point */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]"
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-screen flex-col justify-between p-12">
        <span className="max-w-xs font-display text-sm font-semibold uppercase tracking-widest text-text-muted">
          An independent Manchester United fan community
        </span>

        <div className="relative mx-auto h-[45vh] w-full max-w-md overflow-hidden rounded-card border border-white/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
          <Image
            src="/images/stadium/old-trafford-reds-mural.jpg"
            alt="'THE REDS GO MARCHING ON' — the mural on Old Trafford's forecourt wall"
            fill
            priority
            sizes="(min-width: 1024px) 30vw, 90vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-bg-void/80 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        <PullQuote
          quote="It's not just about winning. It's about being United."
          attribution="Sir Alex Ferguson"
          className="max-w-sm"
        />
      </div>
    </div>
  );
}
