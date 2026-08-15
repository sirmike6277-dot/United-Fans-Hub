import Image from "next/image";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatTile } from "@/components/ui/StatTile";
import { Tabs } from "@/components/ui/Tabs";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { crownFor, SeasonAura } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { PostCard, type CurrentUser } from "@/components/community/PostCard";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { PredictionHistoryList } from "@/components/predictions/PredictionHistoryList";
import { evaluateBadge, type Badge as BadgeRow, type FanStats } from "@/lib/achievements/achievements";
import type { PredictionHistoryEntry, PredictionStats } from "@/lib/predictions/predictions";
import type { FeedPost } from "@/lib/community/posts";
import type { Tables } from "@/lib/supabase/database.types";
import { PLATFORM_LABELS, type SocialLink } from "@/lib/profile/socialLinks";
import { FanLevelProgress } from "./FanLevelProgress";
import type { LevelProgress } from "@/lib/achievements/fanLevels";

export interface ProfileViewProps {
  profile: Tables<"profiles">;
  /** Own-profile shows "Edit Profile"; another member's shows "Message"/"Follow" — the caller decides, keeping this component messaging-agnostic. */
  action: ReactNode;
  /** Optional — computed via the existing leaderboard.ts rank query (Phase 8B), same public fan_points-derived rank shown on /predictions. Null/omitted degrades gracefully to no badge, never a fabricated number. */
  rank?: number | null;
  totalParticipants?: number;
  /** Real counts from `follows` — omitted (not 0) while still loading, so the badge never briefly flashes a wrong number. */
  followerCount?: number | null;
  followingCount?: number | null;
  /** Real published-post count — public data, shown on any profile. */
  postsCount?: number | null;
  /** Real prediction count — `predictions` is RLS'd to the owner only, so this is only ever passed (and only ever shown) on a fan's own profile, never a public one. */
  predictionsCount?: number | null;
  /** The signed-in visitor's own identity — needed for the Posts tab's reaction/comment composer, regardless of whose profile this is. */
  viewer: CurrentUser;
  posts: FeedPost[];
  postsError: string | null;
  badges: BadgeRow[];
  fanStats: FanStats;
  /** Only ever passed on a fan's own profile (predictions are private) — omitted hides the Predictions tab entirely rather than showing it empty. */
  predictionHistory?: PredictionHistoryEntry[] | null;
  predictionStats?: PredictionStats | null;
  /** Public data (social_links is publicly readable) — real handles the fan added themselves, never fabricated. */
  socialLinks?: SocialLink[];
  /** Derived from the real fan_levels ladder + this profile's real fan_points (see computeLevelProgress) — omitted degrades to no progress card, never a fabricated bar. */
  levelProgress?: LevelProgress | null;
}

const fields: Array<{
  label: string;
  key: "favourite_player" | "favourite_era" | "favourite_shirt" | "matchday_routine" | "fan_style" | "favourite_chant";
}> = [
  { label: "Favourite Player", key: "favourite_player" },
  { label: "Favourite Era", key: "favourite_era" },
  { label: "Favourite Shirt", key: "favourite_shirt" },
  { label: "Matchday Routine", key: "matchday_routine" },
  { label: "Fan Style", key: "fan_style" },
  { label: "Favourite Chant", key: "favourite_chant" },
];

/**
 * Presentational profile layout — extracted from the original /profile page
 * so it can be reused for both the authenticated user's own profile and
 * another member's public profile (Phase 6A), without duplicating the
 * header/cover/badges/fields markup. Behavior-preserving: identical output
 * to the original inline JSX, just parameterized by an `action` slot.
 */
export function ProfileView({
  profile,
  action,
  rank,
  totalParticipants,
  followerCount,
  followingCount,
  postsCount,
  predictionsCount,
  viewer,
  posts,
  postsError,
  badges,
  fanStats,
  predictionHistory,
  predictionStats,
  socialLinks = [],
  levelProgress,
}: ProfileViewProps) {
  const earnedCount = badges.filter((b) => evaluateBadge(b.criteria, fanStats).state === "earned").length;
  const crown = crownFor(profile);

  return (
    <main className="flex-1 bg-bg-void pb-20">
      {/* Banner — tall enough to actually show a real photo, not just a sliver of one, with the same cinematic gradient language as the landing Hero. Position follows the fan's own saved focus point (see CoverUpload). */}
      <div className="relative h-56 w-full overflow-hidden bg-bg-elevated sm:h-72 lg:h-80">
        <Image
          src={profile.cover_url || "/images/stadium/old-trafford-interior.jpg"}
          alt=""
          fill
          className={`object-cover ${profile.cover_url ? "" : "opacity-50"}`}
          style={{ objectPosition: `center ${profile.cover_url ? profile.cover_focus_y : 50}%` }}
          priority
        />
        <div className="pointer-events-none absolute -right-20 -top-20 opacity-[0.06]" aria-hidden="true">
          <ClubEmblem size={420} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(218,41,28,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-void via-bg-void/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/*
          relative + z-10 here (and on the wrapper above) is load-bearing,
          not decorative: the banner above is `position: relative` (needed
          for its `fill` Image), and CSS stacks *any* positioned box above
          a plain static one regardless of DOM order — so without this, the
          banner was painting over the top of the avatar everywhere the
          negative margin pulled it up underneath, i.e. exactly the "cut in
          half" bug. Giving this row its own stacking position fixes it.
        */}
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
            {/* Behind the avatar circle (DOM order = paint order) so only
                the spinning ring peeks out around its edge — same effect
                as the small Avatar component, scaled up here. */}
            {crown === "season" ? <SeasonAura inset={-6} /> : null}
            <div
              title={crown === "season" ? "Fan of the Season" : crown === "month" ? "Fan of the Month" : undefined}
              className={`relative h-full w-full overflow-hidden rounded-full border-4 border-bg-void bg-bg-elevated shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
                crown === "month" ? "ring-2 ring-[#f2c14e] ring-offset-2 ring-offset-bg-void" : ""
              }`}
              // Season: same two-tone gold→purple treatment as the small
              // Avatar component elsewhere, plus the rotating SeasonAura
              // behind it — a plain single-colour ring would read
              // identically to Month at this larger size too.
              style={
                crown === "season"
                  ? { boxShadow: "0 0 0 2px var(--color-bg-void), 0 0 0 5px #f2c14e, 0 0 14px 3px rgba(124,58,237,0.65)" }
                  : undefined
              }
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name ?? profile.username}
                  width={144}
                  height={144}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  No photo
                </div>
              )}
            </div>
            {crown ? (
              <span
                className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[70%] drop-shadow-sm"
                aria-hidden="true"
              >
                {crown === "season" ? (
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" className="season-shimmer-drop">
                    <defs>
                      <linearGradient id="profileCrownSeason" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fde08a" />
                        <stop offset="50%" stopColor="#c9a5f2" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M3 17.5h18l-1.6-8-4.6 3.6L12 6.5l-2.8 6.6-4.6-3.6L3 17.5Z"
                      fill="url(#profileCrownSeason)"
                      stroke="#4c1d95"
                      strokeWidth={0.6}
                      strokeLinejoin="round"
                    />
                    <path d="M3 20.5h18" stroke="url(#profileCrownSeason)" strokeWidth={1.5} />
                    <circle cx="12" cy="6.5" r="1.6" fill="#fff4d6" stroke="#4c1d95" strokeWidth={0.4} />
                    <circle cx="7.5" cy="17.5" r="1" fill="#fde08a" />
                    <circle cx="12" cy="17.5" r="1.2" fill="#fff4d6" />
                    <circle cx="16.5" cy="17.5" r="1" fill="#fde08a" />
                  </svg>
                ) : (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="#f2c14e" stroke="#8b5e00" strokeWidth={0.75} strokeLinejoin="round">
                    <path d="M4 17h16l-1.4-7-4.1 3.2L12 8l-2.5 5.2L5.4 10 4 17Z" />
                    <path d="M4 20h16" strokeWidth={1.5} />
                  </svg>
                )}
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                  {profile.display_name || profile.username}
                </h1>
                <RoleBadge profileId={profile.id} />
              </div>
              <p className="text-sm text-text-muted">@{profile.username}</p>
            </div>
            {action}
          </div>
        </div>

        {followerCount != null || followingCount != null ? (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span>
              <span className="font-display font-bold text-ink">{(followerCount ?? 0).toLocaleString()}</span>{" "}
              <span className="text-text-muted">{followerCount === 1 ? "Follower" : "Followers"}</span>
            </span>
            <span>
              <span className="font-display font-bold text-ink">{(followingCount ?? 0).toLocaleString()}</span>{" "}
              <span className="text-text-muted">Following</span>
            </span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {profile.is_current_fan_of_season ? (
            <Badge
              tone="red"
              className="season-shimmer-bg"
              style={{
                backgroundImage: "linear-gradient(120deg, #fde08a, #c9a5f2 35%, #7c3aed 60%, #c9a5f2 85%, #fde08a)",
                color: "#2e1065",
              }}
            >
              👑 Season Royalty
            </Badge>
          ) : profile.is_current_fan_of_month ? (
            <Badge tone="red" style={{ backgroundColor: "#f2c14e", color: "#3a2600" }}>
              👑 Fan of the Month
            </Badge>
          ) : null}
          <FanLevelBadge level={profile.fan_level} size="lg" />
          <Badge tone="neutral">{profile.fan_points.toLocaleString()} pts</Badge>
          {/* A rank computed purely from a fan_points-desc/id-asc tie-break
              is meaningless at 0 points (right now, that's most fans — see
              LeaderboardRow's note) — showing "Rank #1" off a tie nobody
              actually won would be a fabricated signal. */}
          {rank && profile.fan_points > 0 ? (
            <Badge tone="outline">
              Rank #{rank}
              {totalParticipants ? ` of ${totalParticipants.toLocaleString()}` : ""}
            </Badge>
          ) : null}
          {earnedCount > 0 ? <Badge tone="outline">{earnedCount} badges earned</Badge> : null}
          {profile.fan_since_year ? (
            <Badge tone="outline">Fan since {profile.fan_since_year}</Badge>
          ) : null}
          {(profile.location || profile.country) ? (
            <Badge tone="outline">
              {[profile.location, profile.country].filter(Boolean).join(", ")}
            </Badge>
          ) : null}
        </div>

        {levelProgress ? (
          <div className="mt-6 max-w-md">
            <FanLevelProgress progress={levelProgress} fanPoints={profile.fan_points} />
          </div>
        ) : null}

        {profile.bio ? <p className="mt-6 max-w-2xl text-text-body">{profile.bio}</p> : null}

        {postsCount != null ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4">
            <StatTile label="Posts" value={postsCount.toLocaleString()} />
            {predictionsCount != null ? (
              <StatTile label="Predictions" value={predictionsCount.toLocaleString()} />
            ) : null}
            {predictionStats ? (
              <StatTile
                label="Accuracy"
                value={
                  predictionStats.completedPredictions > 0
                    ? `${Math.round((predictionStats.correctPredictions / predictionStats.completedPredictions) * 100)}%`
                    : "—"
                }
                caption={predictionStats.completedPredictions > 0 ? `${predictionStats.correctPredictions}/${predictionStats.completedPredictions} correct` : "No settled predictions yet"}
              />
            ) : null}
            {rank && profile.fan_points > 0 ? <StatTile label="Global Rank" value={`#${rank}`} /> : null}
          </div>
        ) : null}

        <div className="mt-10">
          <Tabs
            tabs={[
              {
                key: "about",
                label: "About",
                content: (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {fields.map(({ label, key }) =>
                        profile[key] ? (
                          <Card key={key}>
                            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
                            <p className="mt-2 text-ink">{profile[key]}</p>
                          </Card>
                        ) : null,
                      )}
                    </div>
                    {profile.favourite_memory ? (
                      <Card>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Favourite Memory
                        </p>
                        <p className="mt-2 text-text-body">{profile.favourite_memory}</p>
                      </Card>
                    ) : null}
                    {socialLinks.length > 0 ? (
                      <Card>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Social Links</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {socialLinks.map((link) => (
                            <Badge key={link.id} tone="outline">
                              {PLATFORM_LABELS[link.platform]}: {link.handleOrUrl}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                    {!fields.some((f) => profile[f.key]) && !profile.favourite_memory && socialLinks.length === 0 ? (
                      <p className="py-6 text-center text-sm text-text-muted">
                        {profile.display_name || profile.username} hasn&apos;t filled in their fan story yet.
                      </p>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "posts",
                label: "Posts",
                content: postsError ? (
                  <p className="py-6 text-center text-sm text-text-muted">{postsError}</p>
                ) : posts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-muted">No posts yet.</p>
                ) : (
                  <div className="flex max-w-2xl flex-col gap-4">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} currentUser={viewer} />
                    ))}
                  </div>
                ),
              },
              {
                key: "achievements",
                label: "Achievements",
                content: (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {badges.map((badge) => (
                      <AchievementCard
                        key={badge.id}
                        badgeKey={badge.key}
                        name={badge.name}
                        description={badge.description}
                        status={evaluateBadge(badge.criteria, fanStats)}
                      />
                    ))}
                  </div>
                ),
              },
              ...(predictionHistory
                ? [
                    {
                      key: "predictions",
                      label: "Predictions",
                      content: <PredictionHistoryList predictions={predictionHistory} error={null} />,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
    </main>
  );
}
