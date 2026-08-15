import { computeLevelProgress, fetchFanLevels, type LevelProgress } from "@fanhub/shared";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase/client";

export default function ProfileScreen() {
  const { profile, loading, error, refresh } = useProfile();
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchFanLevels(supabase).then((levels) => {
      if (levels.length) setLevelProgress(computeLevelProgress(profile.fanPoints, levels));
    });
  }, [profile]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // AuthGate redirects to /(auth)/login automatically once the session
    // clears — no manual navigation needed here.
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-void">
        <ActivityIndicator color="#DA291C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-void" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DA291C" />}
      >
        {error ? (
          <View className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3">
            <Text className="text-sm text-red-hover">{error}</Text>
          </View>
        ) : null}

        <View className="items-center gap-3">
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-bg-elevated">
              <Text className="font-display text-3xl font-bold text-white">
                {(profile?.displayName || profile?.username || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="items-center gap-0.5">
            <Text className="font-display text-xl font-bold text-white">
              {profile?.displayName || profile?.username}
            </Text>
            <Text className="text-sm text-text-muted">@{profile?.username}</Text>
          </View>
        </View>

        <Card className="flex-row items-center justify-around">
          <View className="items-center gap-1">
            <Text className="font-display text-lg font-bold text-white">
              {levelProgress?.currentLevel ?? profile?.fanLevel ?? "—"}
            </Text>
            <Text className="text-xs uppercase text-text-muted">Fan Level</Text>
          </View>
          <View className="h-8 w-px bg-white/10" />
          <View className="items-center gap-1">
            <Text className="font-display text-lg font-bold text-white">{profile?.fanPoints ?? 0}</Text>
            <Text className="text-xs uppercase text-text-muted">Points</Text>
          </View>
        </Card>

        {levelProgress ? (
          <Card className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {levelProgress.currentTitle}
            </Text>
            <View className="h-2 overflow-hidden rounded-full bg-white/10">
              <View className="h-full rounded-full bg-red-primary" style={{ width: `${levelProgress.progressPercent}%` }} />
            </View>
            <Text className="text-xs text-text-muted">
              {levelProgress.nextTitle
                ? `${levelProgress.pointsIntoLevel}/${levelProgress.pointsSpanOfLevel} pts to ${levelProgress.nextTitle}`
                : "Highest fan level reached"}
            </Text>
          </Card>
        ) : null}

        <View className="gap-2 pt-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Coming to mobile next
          </Text>
          <Card>
            <Text className="text-sm text-text-muted">
              Edit profile, achievements, awards, and settings are still web-only — this app doesn&apos;t
              fabricate them, they&apos;ll be built out in the next phase against the same profile data
              shown above.
            </Text>
          </Card>
        </View>

        <Button variant="secondary" onPress={handleSignOut} loading={signingOut}>
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
