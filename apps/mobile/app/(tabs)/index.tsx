import {
  computeLevelProgress,
  fetchFanLevels,
  fetchManchesterUnitedClubId,
  fetchUpcomingMatches,
  formatMatchDateTime,
  type LevelProgress,
  type MatchSummary,
} from "@fanhub/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export default function HomeScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile();
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<MatchSummary | null>(null);
  const [matchState, setMatchState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile) {
      const levels = await fetchFanLevels(supabase);
      if (levels.length) setLevelProgress(computeLevelProgress(profile.fanPoints, levels));
    }

    const clubId = await fetchManchesterUnitedClubId(supabase);
    if (!clubId) {
      setMatchState("unavailable");
      return;
    }
    const { matches } = await fetchUpcomingMatches(supabase, { clubId, limit: 1 });
    setUpcomingMatch(matches[0] ?? null);
    setMatchState("ready");
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshProfile(), load()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-void" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 12, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DA291C" />}
      >
        <View className="gap-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Manchester United
          </Text>
          <Text className="font-display text-2xl font-extrabold text-white">
            {profileLoading ? "Welcome back" : `Welcome back, ${profile?.displayName || profile?.username || "fan"}`}
          </Text>
        </View>

        <Card className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">Your Fan Level</Text>
          {levelProgress ? (
            <>
              <View className="flex-row items-baseline justify-between">
                <Text className="font-display text-lg font-bold text-white">
                  Lv.{levelProgress.currentLevel} — {levelProgress.currentTitle}
                </Text>
                <Text className="text-sm text-text-muted">{profile?.fanPoints ?? 0} pts</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-white/10">
                <View
                  className="h-full rounded-full bg-red-primary"
                  style={{ width: `${levelProgress.progressPercent}%` }}
                />
              </View>
              <Text className="text-xs text-text-muted">
                {levelProgress.nextTitle
                  ? `${levelProgress.pointsIntoLevel}/${levelProgress.pointsSpanOfLevel} pts to ${levelProgress.nextTitle}`
                  : "Highest fan level reached"}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-text-muted">Loading your progress…</Text>
          )}
        </Card>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">Next Match</Text>
          {matchState === "loading" ? (
            <Card>
              <Text className="text-sm text-text-muted">Loading fixture…</Text>
            </Card>
          ) : matchState === "unavailable" || !upcomingMatch ? (
            <EmptyState
              title="No upcoming fixture right now"
              message="Match Centre data syncs from a live football feed — check back closer to the next matchday."
            />
          ) : (
            <Card className="gap-1.5">
              <Text className="text-xs font-semibold uppercase text-red-primary">
                {upcomingMatch.competition ?? "Fixture"}
              </Text>
              <Text className="font-display text-lg font-bold text-white">
                {upcomingMatch.isHome ? "Man Utd" : upcomingMatch.opponentName} vs{" "}
                {upcomingMatch.isHome ? upcomingMatch.opponentName : "Man Utd"}
              </Text>
              <Text className="text-sm text-text-muted">{formatMatchDateTime(upcomingMatch.kickoffAt)}</Text>
              {upcomingMatch.venue ? <Text className="text-xs text-text-muted">{upcomingMatch.venue}</Text> : null}
            </Card>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">Community</Text>
          <EmptyState
            title="Community feed lands here next"
            message="Posts, reactions, and Fan Room activity will show up in this space — open the Community tab to see it live."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
