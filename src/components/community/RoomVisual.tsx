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
  /** SVG icon fallback, used whenever `logoSrc` isn't set. */
  Icon: RoomIconComponent;
  className: string;
  /** Real photo/logo asset path (under /public), rendered instead of `Icon` when set. */
  logoSrc?: string;
  /**
   * "badge" (default): the logo sits inset on a solid backing circle — for
   * a crest drawn with internal whitespace around it (a competition logo,
   * the club emblem), so it reads clearly against this app's dark UI
   * instead of vanishing into it. "cover": the image fills the circle
   * edge-to-edge — for a graphic with no internal margin (Transfer Talk's
   * banner). See public/images/rooms/README.md for sourcing/licensing.
   */
  logoFit?: "badge" | "cover";
  /** Backing colour for "badge" fit. "white" gives a crest drawn in a dark
   * ink (Premier League, Champions League) a plate it can actually sit on;
   * omitted, the theme's own tinted `className` backs it instead (used for
   * the club emblem, which already reads fine on a dark tint). */
  logoBg?: "white";
}

/**
 * Per-room icon, keyed first by this app's real room slugs (exact,
 * reliable) with a keyword fallback for any room created later that isn't
 * in the map yet.
 *
 * Manchester United News/Fans use the club's own real emblem
 * (public/images/branding/manchester-united-emblem.webp — already used
 * elsewhere in the app: Navbar, Hero). Premier League, Champions League,
 * and Transfer Talk use real competition/broadcast logos supplied by the
 * project owner from `reference designs/` — see
 * public/images/rooms/README.md for exactly where each came from and the
 * licensing caveat that applies before any public/production deployment.
 * Every other room keeps an original SVG glyph — never a redrawn/traced
 * copy of a protected logo.
 */
const THEME_BY_SLUG: Record<string, RoomTheme> = {
  "premier-league": {
    Icon: TrophyIcon,
    className: "bg-amber-500/15 text-amber-400",
    logoSrc: "/images/rooms/premier-league.png",
    logoBg: "white",
  },
  "champions-league": {
    Icon: StarIcon,
    className: "bg-indigo-500/15 text-indigo-400",
    logoSrc: "/images/rooms/champions-league.png",
    logoBg: "white",
  },
  "matchday-chat": { Icon: WhistleIcon, className: "bg-green-500/15 text-green-400" },
  "general-fan-chat": { Icon: UsersIcon, className: "bg-orange-500/15 text-orange-400" },
  "manchester-united-news": {
    Icon: ShieldIcon,
    className: "bg-red-primary/15 text-red-primary",
    logoSrc: "/images/branding/manchester-united-emblem.webp",
  },
  "transfer-talk": {
    Icon: SwapIcon,
    className: "bg-violet-500/15 text-violet-400",
    logoSrc: "/images/rooms/transfer-news.jpg",
    logoFit: "cover",
  },
  "manchester-united-fans": {
    Icon: ShieldIcon,
    className: "bg-red-primary/15 text-red-primary",
    logoSrc: "/images/branding/manchester-united-emblem.webp",
  },
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
  const { Icon, className, logoSrc, logoFit = "badge", logoBg } = getRoomVisual(name, slug);

  if (logoSrc && logoFit === "cover") {
    return (
      <span className="relative flex shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
        <Image src={logoSrc} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }

  if (logoSrc) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${logoBg === "white" ? "bg-white" : className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={logoSrc}
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
