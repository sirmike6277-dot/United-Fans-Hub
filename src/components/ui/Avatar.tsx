import Image from "next/image";

export interface AvatarProps {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Circular avatar with an initials fallback — used anywhere a profile's
 * identity is shown outside the full /profile page itself (feed, comments).
 * Never fabricates a photo: no avatar_url means initials, always.
 */
export function Avatar({ url, name, size = 40, className = "" }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-text-muted ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          className="font-display font-semibold"
          style={{ fontSize: Math.max(12, size * 0.4) }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </span>
  );
}
