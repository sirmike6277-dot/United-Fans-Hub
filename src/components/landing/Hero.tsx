import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { PlayerImage } from "@/components/media/PlayerImage";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { TheatreOfDreamsMark } from "@/components/ui/TheatreOfDreamsMark";

const players = [
  { src: "/images/players/tielemans.webp", alt: "Youri Tielemans", position: "left" as const },
  { src: "/images/players/bruno-fernandes.webp", alt: "Bruno Fernandes", position: "center" as const },
  { src: "/images/players/sesko.webp", alt: "Benjamin Šeško", position: "right" as const },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-bg-void">
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
        className="absolute inset-0 bg-gradient-to-b from-bg-elevated/45 via-bg-void/75 to-bg-void"
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
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-text-muted">
          An independent Manchester United fan community
        </span>

        <TheatreOfDreamsMark className="mt-5 text-2xl sm:text-3xl" />

        <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold uppercase leading-tight text-white sm:text-6xl lg:text-7xl">
          More than a club.
          <br />
          <span className="text-red-primary">We are a family.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-text-body sm:text-xl">
          Connect. Predict. Debate. Celebrate.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button href="/signup" size="lg" className="w-full sm:w-auto">
            Join the community
          </Button>
          <Button href="#features" variant="secondary" size="lg" className="w-full sm:w-auto">
            Explore features
          </Button>
        </div>

        {/* Cinematic player composition — layered, overlapping, not a row of plain cards */}
        <div className="relative mt-16 flex h-[280px] w-full max-w-3xl items-end justify-center sm:h-[380px] lg:h-[460px]">
          {players.map((player, i) => (
            <div
              key={player.alt}
              className="absolute bottom-0 h-full w-[46%] sm:w-[38%]"
              style={{
                left: i === 0 ? "0%" : i === 2 ? undefined : "50%",
                right: i === 2 ? "0%" : undefined,
                transform: i === 1 ? "translateX(-50%) scale(1.08)" : undefined,
                zIndex: i === 1 ? 10 : 5 - i,
              }}
            >
              <PlayerImage
                src={player.src}
                alt={player.alt}
                position={player.position}
                priority={i === 1}
              />
            </div>
          ))}
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-void to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
