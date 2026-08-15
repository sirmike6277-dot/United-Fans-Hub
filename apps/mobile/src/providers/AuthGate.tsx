import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "./AuthProvider";

/**
 * Route guard: redirects between the (auth) stack and the (tabs) app based
 * on session state. Runs on every segment change, mirroring what the web
 * app's middleware-free server-component session checks do per request.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "(auth)";
    // Both reached with no session yet, mid-exchange of a deep link's code
    // for a real session (see handleAuthDeepLink.ts) — must stay reachable
    // while signed out, or the redirect below would bounce the user to
    // /login before the exchange even finishes.
    const isAuthCallback = segments[0] === "auth-callback";
    const isResetPassword = inAuthGroup && segments[1] === "reset-password";

    if (!session && !inAuthGroup && !isAuthCallback) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup && !isResetPassword) {
      // Exception: reset-password's session is a temporary recovery
      // session (created by exchanging the reset link's code) — the user
      // needs to stay on that screen to actually set their new password,
      // not get bounced into the main app mid-flow.
      router.replace("/(tabs)");
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-void">
        <ActivityIndicator color="#DA291C" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
