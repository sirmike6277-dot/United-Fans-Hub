import Image from "next/image";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { Tabs } from "@/components/ui/Tabs";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { PostCard, type CurrentUser } from "@/components/community/PostCard";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { PredictionHistoryList } from "@/components/predictions/PredictionHistoryList";
import { evaluateBadge, type Badge as BadgeRow, type FanStats } from "@/lib/achievements/achievements";
import type { PredictionHistoryEntry, PredictionStats } from "@/lib/predictions/predictions";
import type { FeedPost } from "@/lib/community/posts";
import type { Tables } from "@/lib/supabase/database.types";

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
}

const fields: Array<{ label: string; key: "favourite_player" | "favourite_era" | "favourite_shirt" }> = [
  { label: "Favourite Player", key: "favourite_player" },
  { label: "Favourite Era", key: "favourite_era" },
  { label: "Favourite Shirt", key: "favourite_shirt" },
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
}: ProfileViewProps) {
  const earnedCount = badges.filter((b) => evaluateBadge(b.criteria, fanStats).state === "earned").length;

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
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-bg-void bg-bg-elevated shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:h-36 sm:w-36">
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
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-text-muted">@{profile.username}</p>
            </div>
            {action}
          </div>
        </div>

        {followerCount != null || followingCount != null ? (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span>
              <span className="font-display font-bold text-white">{(followerCount ?? 0).toLocaleString()}</span>{" "}
              <span className="text-text-muted">{followerCount === 1 ? "Follower" : "Followers"}</span>
            </span>
            <span>
              <span className="font-display font-bold text-white">{(followingCount ?? 0).toLocaleString()}</span>{" "}
              <span className="text-text-muted">Following</span>
            </span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge tone="red">Level {profile.fan_level}</Badge>
          <Badge tone="neutral">{profile.fan_points.toLocaleString()} pts</Badge>
          {rank ? (
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
            {rank ? <StatTile label="Global Rank" value={`#${rank}`} /> : null}
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
                            <p className="mt-2 text-white">{profile[key]}</p>
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
                    {!fields.some((f) => profile[f.key]) && !profile.favourite_memory ? (
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
