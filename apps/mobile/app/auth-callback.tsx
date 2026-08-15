import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { handleAuthDeepLink } from "@/lib/supabase/handleAuthDeepLink";

/** Reached via the signup-confirmation email's deep link — see signup.tsx. */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    handleAuthDeepLink(url).then((result) => {
      if (result.ok) {
        router.replace("/(tabs)");
      } else {
        setError(result.error ?? "That link is invalid or has expired.");
      }
    });
  }, [url, router]);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg-void px-6">
      {error ? (
        <>
          <Text className="text-center font-display text-lg font-bold text-white">Link problem</Text>
          <Text className="text-center text-sm text-text-muted">{error}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator color="#DA291C" />
          <Text className="text-sm text-text-muted">Confirming your account…</Text>
        </>
      )}
    </View>
  );
}
