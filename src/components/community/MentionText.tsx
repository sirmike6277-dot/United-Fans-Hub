import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export interface MentionRef {
  id: string;
  username: string;
}

export interface MentionTextProps {
  text: string;
  mentions: MentionRef[];
  className?: string;
  /**
   * Override the mention link's own color — needed on Fan Rooms' "own
   * message" bubble (bg-red-primary): the default red-on-transparent
   * mention style becomes invisible red-on-red there (a real contrast bug
   * found via the Master Product Completion Phase's preview screenshots).
   * Posts/comments never sit on a red background, so their default is fine.
   */
  mentionClassName?: string;
}

/**
 * Renders post/comment body text, linkifying only the @username tokens that
 * are backed by a real row in `mentions` for this exact post/comment (passed
 * in via `mentions`, embedded alongside the post/comment fetch). Plain
 * "@word" text that isn't a validated mention — someone talking about a
 * handle without actually mentioning them, or a username that no longer
 * resolves — renders as ordinary text rather than a broken/fabricated link.
 */
export function MentionText({ text, mentions, className, mentionClassName }: MentionTextProps) {
  if (mentions.length === 0) {
    return <p className={className}>{text}</p>;
  }

  const byUsername = new Map(mentions.map((m) => [m.username.toLowerCase(), m]));
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // A fresh regex instance per render — a module-level `g`-flagged RegExp
  // would carry mutable .lastIndex state across renders/components, which
  // is exactly the kind of outer-scope mutation React (and this project's
  // lint config) flags as unsafe.
  const token = /@([a-zA-Z0-9_]{3,24})/g;

  while ((match = token.exec(text)) !== null) {
    const [full, username] = match;
    const start = match.index;
    const mention = byUsername.get(username.toLowerCase());

    if (!mention) continue;

    if (start > lastIndex) {
      parts.push(<Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex, start)}</Fragment>);
    }
    parts.push(
      <Link
        key={`m-${start}`}
        href={`/profile/${mention.id}`}
        className={mentionClassName ?? "font-medium text-red-primary hover:text-red-hover hover:underline"}
      >
        {full}
      </Link>,
    );
    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return <p className={className}>{parts}</p>;
}
