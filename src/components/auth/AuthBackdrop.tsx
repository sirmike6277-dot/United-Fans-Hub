import Image from "next/image";
import { ClubEmblem } from "@/components/media/ClubEmblem";

export interface AuthBackdropProps {
  /** Left-side photo, faded out toward the centre. */
  leftSrc: string;
  /** Right-side photo, faded in from the centre, sitting behind the emblem. */
  rightSrc: string;
}

/**
 * Full-bleed background shared by both columns of the auth split-screen
 * (`AuthLayout`), so the desktop layout reads as one continuous canvas
 * instead of "half" the page — a photo on the left, nothing on the right.
 *
 * Two real, licensed Old Trafford photos (sourced from `reference designs/`;
 * see public/images/stadium/README.md) sit on opposite sides, each masked to
 * fade out toward the centre so they blend into one another rather than
 * meeting at a hard seam. The supplied Manchester United emblem
 * (public/images/branding/README.md) sits large and faded over the right
 * side's fade, so the crest itself is part of what the two photos blend
 * into at the middle.
 *
 * Server-rendered only: `ClubEmblem` checks the filesystem for the licensed
 * asset, which requires staying out of any "use client" tree.
 */
export function AuthBackdrop({ leftSrc, rightSrc }: AuthBackdropProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-cinema-elevated" aria-hidden="true">
      {/* Left photo — fades out toward the centre */}
      <div className="absolute inset-y-0 left-0 w-[62%] [mask-image:linear-gradient(to_right,black_45%,transparent_100%)]">
        <Image src={leftSrc} alt="" fill priority sizes="62vw" className="object-cover opacity-40" />
      </div>

      {/* Right photo — fades in from the centre, underneath the emblem */}
      <div className="absolute inset-y-0 right-0 w-[62%] [mask-image:linear-gradient(to_left,black_45%,transparent_100%)]">
        <Image src={rightSrc} alt="" fill priority sizes="62vw" className="object-cover opacity-25" />
      </div>

      {/* Manchester United emblem — oversized and faded, the dominant right-side background element the two photos blend into */}
      <div
        className="pointer-events-none absolute right-[-8%] top-1/2 -translate-y-1/2 opacity-[0.14]"
        aria-hidden="true"
      >
        <ClubEmblem size={720} />
      </div>

      {/* Cross-fade + legibility gradients, echoing the landing hero's treatment */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-cinema-elevated/40 via-cinema-void/70 to-cinema-void"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(218,41,28,0.16),transparent_60%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}
