import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { handleAuthDeepLink } from "@/lib/supabase/handleAuthDeepLink";
import { supabase } from "@/lib/supabase/client";

/**
 * Reached via the `manutdfanshub://reset-password?code=...` deep link from
 * the password-reset email (see forgot-password.tsx's redirectTo). The
 * incoming code must be exchanged for a real (temporary) recovery session
 * before updateUser() below can set the new password on it — same
 * exchange as auth-callback.tsx, just gating this form instead of a
 * redirect.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [exchanging, setExchanging] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirmError = useMemo(
    () => (confirmPassword && confirmPassword !== password ? "Passwords do not match." : undefined),
    [confirmPassword, password],
  );

  useEffect(() => {
    if (!url) return;
    handleAuthDeepLink(url).then((result) => {
      setExchanging(false);
      if (!result.ok) setError(result.error ?? "That reset link may have expired.");
    });
  }, [url]);

  async function handleSubmit() {
    if (!password || confirmError) return;
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("That reset link may have expired. Please request a new one.");
      return;
    }
    setDone(true);
  }

  if (exchanging) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#DA291C" />
          <Text className="text-sm text-text-muted">Verifying your reset link…</Text>
        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-4">
          <Text className="text-center font-display text-xl font-bold uppercase text-white">
            Password updated
          </Text>
          <Text className="text-center text-sm text-text-muted">You can now sign in with your new password.</Text>
          <Button onPress={() => router.replace("/(auth)/login")}>Back to login</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 py-10">
        <Text className="text-center font-display text-2xl font-extrabold uppercase text-white">
          Set a new password
        </Text>

        <View className="w-full gap-5">
          {error ? (
            <View className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3">
              <Text className="text-sm text-red-hover">{error}</Text>
            </View>
          ) : null}

          <TextField
            label="New password"
            placeholder="Enter a new password"
            autoComplete="new-password"
            isPassword
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TextField
            label="Confirm password"
            placeholder="Confirm your new password"
            autoComplete="new-password"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            editable={!loading}
          />

          <Button onPress={handleSubmit} loading={loading} disabled={!password || !!confirmError}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </View>
      </View>
    </Screen>
  );
}
