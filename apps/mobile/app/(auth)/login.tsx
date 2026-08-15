import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { supabase } from "@/lib/supabase/client";

const GENERIC_ERROR = "We couldn't sign you in. Please check your details and try again.";

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!identifier || !password) return;
    setError(null);
    setLoading(true);

    let email = identifier.trim();

    // Same rule as the web app: auth signs in by email only, so a username
    // needs resolving to its email first via the same RPC.
    if (!email.includes("@")) {
      const { data, error: lookupError } = await supabase.rpc("email_for_username", {
        lookup_username: email,
      });
      if (lookupError || !data) {
        setLoading(false);
        setError(GENERIC_ERROR);
        return;
      }
      email = data;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(GENERIC_ERROR);
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-8 py-10">
        <View className="items-center gap-3">
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 88, height: 88, borderRadius: 44 }}
            contentFit="cover"
          />
          <Text className="text-center font-display text-2xl font-extrabold uppercase text-white">
            Man Utd Fans Hub
          </Text>
          <Text className="text-center text-sm text-text-muted">Sign in to your FanHub account</Text>
        </View>

        <View className="w-full gap-5">
          {error ? (
            <View className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3">
              <Text className="text-sm text-red-hover">{error}</Text>
            </View>
          ) : null}

          <TextField
            label="Email or Username"
            placeholder="Enter your email or username"
            autoComplete="username"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!loading}
          />

          <View className="gap-2">
            <TextField
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              isPassword
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <Link href="/(auth)/forgot-password" className="self-end text-xs font-medium text-red-primary">
              Forgot password?
            </Link>
          </View>

          <Button onPress={handleSubmit} loading={loading} disabled={!identifier || !password}>
            {loading ? "Signing you in..." : "Login"}
          </Button>
        </View>

        <View className="flex-row gap-1.5">
          <Text className="text-sm text-text-muted">Don&apos;t have an account?</Text>
          <Link href="/(auth)/signup" className="text-sm font-semibold text-red-primary">
            Sign up
          </Link>
        </View>
      </View>
    </Screen>
  );
}
