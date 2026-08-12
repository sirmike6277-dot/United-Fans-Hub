import Image from "next/image";
import {
  ShieldIcon,
  LaughIcon,
  SwapIcon,
  StarIcon,
  WhistleIcon,
} from "./RoomIcons";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import { UsersIcon } from "@/components/members/MembersIcons";

type RoomIconComponent = (props: { size?: number }) => React.JSX.Element;

interface RoomTheme {
  /** SVG icon, used unless `useClubEmblem` is set. */
  Icon: RoomIconComponent;
  className: string;
  /**
   * Renders the real, licensed Manchester United emblem instead of an SVG
   * glyph — only for rooms that are actually about the club itself. Never
   * used for a competition (see the file header note on Premier
   * League/Champions League) — that would misrepresent United's own crest
   * as the competition's.
   */
  useClubEmblem?: boolean;
}

/**
 * Per-room icon, keyed first by this app's real room slugs (exact,
 * reliable) with a keyword fallback for any room created later that isn't
 * in the map yet. Two deliberate calls worth explaining:
 *
 * 1. Manchester United News / Manchester United Fans use the club's own
 *    real emblem (public/images/branding/manchester-united-emblem.webp) —
 *    already a licensed asset used elsewhere in the app (Navbar, Hero).
 * 2. Premier League / Champions League do NOT use the actual competition
 *    logos — this app has no licence for either trademark. A trophy/star
 *    motif in the competition's associated colour stands in instead: a
 *    real, original design, not a redrawn/traced copy of a protected logo.
 */
const THEME_BY_SLUG: Record<string, RoomTheme> = {
  "premier-league": { Icon: TrophyIcon, className: "bg-amber-500/15 text-amber-400" },
  "champions-league": { Icon: StarIcon, className: "bg-indigo-500/15 text-indigo-400" },
  "matchday-chat": { Icon: WhistleIcon, className: "bg-green-500/15 text-green-400" },
  "general-fan-chat": { Icon: UsersIcon, className: "bg-orange-500/15 text-orange-400" },
  "manchester-united-news": { Icon: ShieldIcon, className: "bg-red-primary/15 text-red-primary", useClubEmblem: true },
  "transfer-talk": { Icon: SwapIcon, className: "bg-violet-500/15 text-violet-400" },
  "manchester-united-fans": { Icon: ShieldIcon, className: "bg-red-primary/15 text-red-primary", useClubEmblem: true },
};

const KEYWORD_THEMES: { test: RegExp; theme: RoomTheme }[] = [
  { test: /premier ?league/i, theme: THEME_BY_SLUG["premier-league"] },
  { test: /champions ?league|european/i, theme: THEME_BY_SLUG["champions-league"] },
  { test: /match ?day|live|score|derby/i, theme: THEME_BY_SLUG["matchday-chat"] },
  { test: /meme|banter|joke|fun/i, theme: { Icon: LaughIcon, className: "bg-amber-500/15 text-amber-400" } },
  { test: /transfer|rumou?r|window|deadline/i, theme: THEME_BY_SLUG["transfer-talk"] },
  { test: /news/i, theme: THEME_BY_SLUG["manchester-united-news"] },
  { test: /fan/i, theme: THEME_BY_SLUG["general-fan-chat"] },
];

const DEFAULT_THEME: RoomTheme = { Icon: ShieldIcon, className: "bg-red-primary/15 text-red-primary" };

export function getRoomVisual(name: string, slug?: string): RoomTheme {
  if (slug && THEME_BY_SLUG[slug]) return THEME_BY_SLUG[slug];
  return KEYWORD_THEMES.find((t) => t.test.test(name))?.theme ?? DEFAULT_THEME;
}

export function RoomAvatar({ name, slug, size = 40 }: { name: string; slug?: string; size?: number }) {
  const { Icon, className, useClubEmblem } = getRoomVisual(name, slug);

  if (useClubEmblem) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src="/images/branding/manchester-united-emblem.webp"
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
