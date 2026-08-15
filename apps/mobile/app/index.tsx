import { Redirect } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

/**
 * Root route — AuthGate (in _layout.tsx) already blocks rendering until the
 * initial session check resolves, so `session` here is never stale. Sends
 * the user straight into the right stack rather than showing a 404 for the
 * unmatched "/" path (neither (auth) nor (tabs) claims it on their own).
 */
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
}
