import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { TheatreOfDreamsMark } from "@/components/ui/TheatreOfDreamsMark";

// This app has no real, licensed individual player photography yet (see
// public/images/players/README.md) — Bruno Fernandes, Šeško, and Tielemans
// each rendered as a dashed "Photo pending" box here, which isn't a fair
// first impression of the hero. Real, licensed Old Trafford photography
// (sourced from `reference designs/`; see public/images/stadium/README.md)
// fills that moment honestly instead, as a framed triptych.
const heroPhotos = [
  {
    src: "/images/stadium/old-trafford-trinity-statue.jpg",
    alt: "The United Trinity statue outside Old Trafford",
  },
  {
    src: "/images/stadium/old-trafford-reds-mural.jpg",
    alt: "'THE REDS GO MARCHING ON' mural on Old Trafford's forecourt",
  },
  {
    src: "/images/stadium/old-trafford-exterior-sunset.jpg",
    alt: "Old Trafford exterior at sunset",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cinema-void">
      {/*
        Cinematic backdrop — a real Old Trafford photo (Harry Walsh, Unsplash
        License; see public/images/stadium/README.md), subdued and blended
        under layered gradients, plus the supplied club emblem as a faded
        watermark. No AI-generated or unlicensed imagery anywhere in this mix.
      */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/stadium/old-trafford-interior.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-cinema-elevated/45 via-cinema-void/75 to-cinema-void"
        aria-hidden="true"
      />

      {/* Oversized emblem watermark — subtle, off-center, faded into the gradient */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 opacity-[0.07]"
        aria-hidden="true"
      >
        <ClubEmblem size={640} />
      </div>

      {/* Floodlight beams — two soft diagonal shafts crossing toward the headline */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "conic-gradient(from 200deg at 20% -10%, rgba(255,255,255,0.05), transparent 18%), conic-gradient(from 160deg at 85% -10%, rgba(255,255,255,0.04), transparent 20%)",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(218,41,28,0.28),transparent_55%)]"
        aria-hidden="true"
      />

      {/* Vignette — darkens the corners so the centre content stays the clear focal point */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        {/* text-white/70, not text-text-muted: this whole section sits on
            bg-cinema-void (see the section wrapper above), which is
            permanently dark and never flips with the light-mode theme —
            text-text-muted does flip, becoming a dark, low-contrast gray
            against this backdrop in light mode (the reported "not bright
            enough" bug). Same fixed-dark-surface reasoning as the photo
            triptych's own cinema-void gradients just below. */}
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
          An independent Manchester United fan community
        </span>

        <TheatreOfDreamsMark className="mt-5 text-2xl sm:text-3xl" />

        <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold uppercase leading-tight text-white sm:text-6xl lg:text-7xl">
          More than a club.
          <br />
          <span className="text-red-primary">We are a family.</span>
        </h1>

        {/* text-white/90, not text-text-body: same cinema-void reasoning as
            the kicker above — text-text-body flips to near-black in light
            mode, which against this permanently-dark hero was effectively
            invisible, not just dim. */}
        <p className="mt-6 max-w-xl text-lg text-white/90 sm:text-xl">
          Connect. Predict. Debate. Celebrate.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button href="/signup" size="lg" className="w-full sm:w-auto">
            Join the community
          </Button>
          {/* variant="secondary" is text-ink/border-ink by default (correct
              on a normal theme-reactive card) — overridden to literal white
              here for the same cinema-void reason as the text above: on
              this permanently-dark hero, light mode's near-black --color-ink
              made this button nearly invisible (transparent background,
              barely-there text/border) — the reported button-visual bug. */}
          <Button
            href="#features"
            variant="secondary"
            size="lg"
            className="w-full !border-white/30 !text-white hover:!border-white/60 sm:w-auto"
          >
            Explore features
          </Button>
        </div>

        {/* Cinematic photo triptych — real Old Trafford photography, layered and overlapping, not a row of plain cards */}
        <div className="relative mt-16 flex h-[280px] w-full max-w-3xl items-center justify-center gap-3 sm:h-[360px] sm:gap-5 lg:h-[420px]">
          {heroPhotos.map((photo, i) => (
            <div
              key={photo.alt}
              className={`relative h-full overflow-hidden rounded-card border border-white/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)] ${
                i === 1 ? "z-10 w-[42%] scale-110" : "w-[30%]"
              }`}
              style={{
                transform:
                  i === 0
                    ? "rotate(-3deg) translateY(14px)"
                    : i === 2
                      ? "rotate(3deg) translateY(14px)"
                      : undefined,
              }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority={i === 1}
                sizes="(min-width: 1024px) 30vw, 45vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-cinema-void/50 via-transparent to-transparent"
                aria-hidden="true"
              />
            </div>
          ))}
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cinema-void to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Bottom blend — fades this section's permanently-cinematic atmosphere
          into FeatureSection's real background colour instead of hard-cutting
          into it. bg-bg-void is theme-reactive, so this is a no-op in dark
          mode (both are already near-black) and a genuine dark-to-light blend
          in light mode, matching FeatureSection's own bg-bg-void exactly. */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg-void sm:h-40"
        aria-hidden="true"
      />
    </section>
  );
}
