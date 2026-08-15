import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { supabase } from "@/lib/supabase/client";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const usernameError = useMemo(
    () => (username && !USERNAME_PATTERN.test(username) ? "3-24 letters, numbers, or _." : undefined),
    [username],
  );
  const confirmError = useMemo(
    () => (confirmPassword && confirmPassword !== password ? "Passwords do not match." : undefined),
    [confirmPassword, password],
  );

  const canSubmit =
    agreed && !usernameError && !confirmError && !loading && fullName && username && email && password;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    // Same-project account as the web app — a user who signs up here can
    // log into manutdfanshub.com with the same credentials, and vice versa.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
        // Deep link back into this app after the confirmation email link is
        // clicked. Requires this exact redirect to be added to Supabase's
        // Auth -> URL Configuration -> Redirect URLs allowlist, same as the
        // web app's own callback URL — see the mobile setup report.
        emailRedirectTo: Linking.createURL("auth-callback"),
      },
    });

    setLoading(false);

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes("already registered")) {
        setError("An account with that email already exists.");
      } else if (message.includes("rate limit")) {
        setError("Too many signup attempts right now — please wait a few minutes and try again.");
      } else {
        setError("We couldn't create your account. That username or email may already be taken.");
      }
      return;
    }

    if (data.session) {
      router.replace("/(tabs)");
      return;
    }

    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 px-4">
          <Text className="text-center font-display text-xl font-bold uppercase text-white">
            Check your inbox
          </Text>
          <Text className="text-center text-sm text-text-muted">
            We&apos;ve sent a confirmation link to{" "}
            <Text className="text-white">{email}</Text>. Click it, then come back and log in.
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
      <View className="gap-5 py-8">
        <View className="items-center gap-1 pb-2">
          <Text className="text-center font-display text-2xl font-extrabold uppercase text-white">
            Create your account
          </Text>
          <Text className="text-center text-sm text-text-muted">Join the Fans Hub community</Text>
        </View>

        {error ? (
          <View className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3">
            <Text className="text-sm text-red-hover">{error}</Text>
          </View>
        ) : null}

        <TextField label="Full Name" placeholder="Enter your full name" autoComplete="name" value={fullName} onChangeText={setFullName} editable={!loading} />

        <View className="gap-1.5">
          <TextField
            label="Username"
            placeholder="Choose a username"
            autoComplete="username"
            value={username}
            onChangeText={(v) => setUsername(v.replace(/\s/g, ""))}
            error={usernameError}
            editable={!loading}
          />
          <Text className="text-xs text-text-muted">Your public fan identity — how the community will see you.</Text>
        </View>

        <TextField
          label="Email"
          placeholder="Enter your email"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TextField
          label="Password"
          placeholder="Create a password (min. 6 characters)"
          autoComplete="new-password"
          isPassword
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TextField
          label="Confirm Password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmError}
          editable={!loading}
        />

        <Pressable className="flex-row items-start gap-3" onPress={() => setAgreed((v) => !v)}>
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              agreed ? "border-red-primary bg-red-primary" : "border-white/30"
            }`}
          >
            {agreed ? <Text className="text-xs font-bold text-white">✓</Text> : null}
          </View>
          <Text className="flex-1 text-sm text-text-muted">
            I agree to the Terms of Service and Privacy Policy.
          </Text>
        </Pressable>

        <Button onPress={handleSubmit} loading={loading} disabled={!canSubmit}>
          {loading ? "Creating your account..." : "Create Account"}
        </Button>

        <View className="flex-row justify-center gap-1.5">
          <Text className="text-sm text-text-muted">Already have an account?</Text>
          <Link href="/(auth)/login" className="text-sm font-semibold text-red-primary">
            Login
          </Link>
        </View>
      </View>
    </Screen>
  );
}
