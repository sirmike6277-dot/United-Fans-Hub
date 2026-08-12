import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";

export type PlayerImagePosition = "left" | "center" | "right";

export interface PlayerImageProps {
  /** Path under /public, e.g. "/images/players/bruno-fernandes.webp" */
  src: string;
  /** Required — real player name, for accessibility. */
  alt: string;
  /** Compositional placement when several PlayerImages are layered in a hero. */
  position?: PlayerImagePosition;
  /** Relative size multiplier for cinematic layering (1 = base size). */
  scale?: number;
  /** Next.js Image priority — set for the above-the-fold hero image. */
  priority?: boolean;
  /** CSS object-position, for cropping control per photo. */
  objectPosition?: string;
  /** Responsive `sizes` attribute passed through to next/image. */
  sizes?: string;
  className?: string;
}

const positionClass: Record<PlayerImagePosition, string> = {
  left: "origin-bottom-left",
  center: "origin-bottom",
  right: "origin-bottom-right",
};

/**
 * Renders real, licensed player photography from /public/images/players.
 *
 * Until the actual file is supplied, this renders a neutral, clearly-labelled
 * placeholder — never an AI-generated or icon-based stand-in — so the hero's
 * composition can be built and reviewed now and the real photo dropped in
 * later with zero redesign.
 */
export function PlayerImage({
  src,
  alt,
  position = "center",
  scale = 1,
  priority = false,
  objectPosition = "center top",
  sizes = "(min-width: 1024px) 33vw, 50vw",
  className = "",
}: PlayerImageProps) {
  const exists = existsSync(join(process.cwd(), "public", src));

  return (
    <div
      className={`relative h-full w-full ${positionClass[position]} ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {exists ? (
        // Bottom fade blends the photo into the section background — only
        // applied to real photography, never to the placeholder below, so
        // the fade can't dim a legibility-critical label into transparency.
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", objectPosition }}
          className="select-none [mask-image:linear-gradient(to_top,transparent,black_18%)]"
        />
      ) : (
        <div
          // Opaque on purpose: once a real photo replaces this, its layer
          // will fully occlude whatever is stacked behind it in the hero's
          // overlapping composition — this placeholder should do the same,
          // rather than letting the box behind it bleed through. Label sits
          // vertically centered (not bottom-aligned) so it stays legible
          // regardless of any bottom fade/gradient layered over the hero.
          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-white/15 bg-bg-elevated px-4 text-center"
          role="img"
          aria-label={alt}
        >
          <span className="text-xs uppercase tracking-wide text-text-muted/70">
            Photo pending
          </span>
          <span className="px-4 text-sm font-medium text-text-muted">{alt}</span>
        </div>
      )}
    </div>
  );
}
