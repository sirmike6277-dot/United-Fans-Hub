import {
  fetchManchesterUnitedClubId,
  fetchRecentResults,
  fetchUpcomingMatches,
  formatMatchDateTime,
  type MatchSummary,
} from "@fanhub/shared";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase/client";

type TabKey = "upcoming" | "results";

function MatchRow({ match }: { match: MatchSummary }) {
  const isFinished = match.status === "finished";
  return (
    <Card className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase text-red-primary">
          {match.competition ?? "Fixture"}
        </Text>
        <Text className="text-xs uppercase text-text-muted">{match.status}</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-display text-base font-bold text-white">
          {match.isHome ? "Man Utd" : match.opponentName} vs {match.isHome ? match.opponentName : "Man Utd"}
        </Text>
        {isFinished && match.homeScore !== null && match.awayScore !== null ? (
          <Text className="font-display text-base font-bold text-white">
            {match.homeScore} - {match.awayScore}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm text-text-muted">{formatMatchDateTime(match.kickoffAt)}</Text>
      {match.venue ? <Text className="text-xs text-text-muted">{match.venue}</Text> : null}
    </Card>
  );
}

export default function MatchesScreen() {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [upcoming, setUpcoming] = useState<MatchSummary[]>([]);
  const [results, setResults] = useState<MatchSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const clubId = await fetchManchesterUnitedClubId(supabase);
    if (!clubId) {
      setState("unavailable");
      return;
    }
    const [upcomingRes, resultsRes] = await Promise.all([
      fetchUpcomingMatches(supabase, { clubId }),
      fetchRecentResults(supabase, { clubId }),
    ]);
    setUpcoming(upcomingRes.matches);
    setResults(resultsRes.matches);
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const list = tab === "upcoming" ? upcoming : results;

  return (
    <SafeAreaView className="flex-1 bg-bg-void" edges={["top", "left", "right"]}>
      <View className="gap-4 px-5 pt-3">
        <Text className="font-display text-2xl font-extrabold text-white">Match Centre</Text>

        <View className="flex-row gap-2">
          {(["upcoming", "results"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className={`rounded-control px-4 py-2 ${tab === key ? "bg-red-primary" : "bg-bg-elevated"}`}
            >
              <Text className={`text-sm font-semibold ${tab === key ? "text-white" : "text-text-muted"}`}>
                {key === "upcoming" ? "Fixtures" : "Results"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DA291C" />}
      >
        {state === "loading" ? (
          <ActivityIndicator color="#DA291C" style={{ marginTop: 24 }} />
        ) : state === "unavailable" ? (
          <EmptyState
            title="Match Centre isn't available right now"
            message="This app never fabricates scores or fixtures — check back once the live football data feed is connected."
          />
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === "upcoming" ? "No upcoming fixtures" : "No recent results"}
            message="Real Manchester United fixture data syncs from a live football feed and will appear here as soon as it's available for the current season."
          />
        ) : (
          list.map((match) => <MatchRow key={match.id} match={match} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
