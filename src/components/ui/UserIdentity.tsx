import Link from "next/link";
import { Avatar, type AvatarCrown } from "./Avatar";

export interface UserIdentityProps {
  name: string;
  username: string;
  avatarUrl: string | null;
  size?: number;
  /** Wraps the whole block in a Link to the profile — omit on contexts that already sit inside their own link/button (e.g. a mention picker row). */
  href?: string;
  /** "inline" = name and @username on one baseline (PostCard's header row); "stack" (default) = name then @username on the line below (MemberCard). */
  layout?: "inline" | "stack";
  className?: string;
  /** The current reigning Fan of the Month/Season, if either — see Avatar's own crownFor() helper for deriving this from a FeedAuthor. */
  crown?: AvatarCrown;
}

/**
 * Avatar + display name + @username — the one piece of markup that was
 * byte-for-byte duplicated across PostCard, MemberCard, and (in spirit)
 * several other identity rows (see Phase 15 audit). Deliberately narrow:
 * it does not try to also own the fan-level badge, since that sits in a
 * different position in nearly every caller (inline, a separate row, or a
 * trailing column) — see FanLevelBadge for that piece, composed alongside
 * this one by the caller.
 */
export function UserIdentity({ name, username, avatarUrl, size = 44, href, layout = "stack", className = "", crown = null }: UserIdentityProps) {
  const content = (
    <>
      <Avatar url={avatarUrl} name={name} size={size} crown={crown} />
      {layout === "inline" ? (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-display font-semibold text-ink">{name}</span>
          <span className="text-sm text-text-muted">@{username}</span>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-ink">{name}</p>
          <p className="truncate text-sm text-text-muted">@{username}</p>
        </div>
      )}
    </>
  );

  const rowClasses = `flex min-w-0 items-center gap-3 ${className}`;

  if (href) {
    return (
      <Link href={href} className={rowClasses}>
        {content}
      </Link>
    );
  }

  return <div className={rowClasses}>{content}</div>;
}
