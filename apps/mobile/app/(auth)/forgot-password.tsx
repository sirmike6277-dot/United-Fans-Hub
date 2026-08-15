import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("reset-password"),
    });

    setLoading(false);

    // Deliberately show the same "sent" state whether or not the email
    // exists — same as the web app, to avoid leaking account existence.
    if (resetError) {
      setError("Something went wrong. Please try again in a moment.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 px-4">
          <Text className="text-center font-display text-xl font-bold uppercase text-white">
            Check your inbox
          </Text>
          <Text className="text-center text-sm text-text-muted">
            If an account exists for <Text className="text-white">{email}</Text>, we&apos;ve sent a
            password reset link.
          </Text>
          <Link href="/(auth)/login" className="mt-4 text-sm font-semibold text-red-primary">
            Back to login
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 py-10">
        <View className="items-center gap-1">
          <Text className="text-center font-display text-2xl font-extrabold uppercase text-white">
            Forgot password?
          </Text>
          <Text className="text-center text-sm text-text-muted">
            Enter your email and we&apos;ll send you a reset link.
          </Text>
        </View>

        <View className="w-full gap-5">
          {error ? (
            <View className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3">
              <Text className="text-sm text-red-hover">{error}</Text>
            </View>
          ) : null}

          <TextField
            label="Email"
            placeholder="Enter your email"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <Button onPress={handleSubmit} loading={loading} disabled={!email}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </View>

        <Link href="/(auth)/login" className="text-sm font-semibold text-red-primary">
          Back to login
        </Link>
      </View>
    </Screen>
  );
}
