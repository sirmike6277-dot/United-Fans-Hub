import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";

export interface ClubEmblemProps {
  /** Path under /public to the real, supplied Manchester United emblem file. */
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

/**
 * Renders the official Manchester United emblem — a separate, licensed asset
 * from the United Fans Hub product logo. Rendered exactly as supplied: no
 * recoloring, redrawing, SVG-tracing, or generic-crest substitution.
 *
 * Until the real file is supplied, this renders nothing (an empty slot)
 * rather than a placeholder crest, per the no-fake-emblem rule.
 */
export function ClubEmblem({
  src = "/images/branding/manchester-united-emblem.webp",
  alt = "Manchester United emblem",
  size = 32,
  className = "",
}: ClubEmblemProps) {
  const exists = existsSync(join(process.cwd(), "public", src));
  if (!exists) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      // Tailwind's preflight reset sets `img { height: auto }`, which
      // otherwise fights next/image's explicit width/height and triggers a
      // console warning. The inline style wins the specificity battle and
      // keeps this a fixed size square regardless.
      style={{ width: size, height: size }}
      className={`select-none ${className}`}
    />
  );
}
