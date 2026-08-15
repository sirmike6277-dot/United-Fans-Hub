import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Deliberately honest placeholder — per the project's own "do not fake
 * functionality" rule, this never renders fabricated posts/messages. The
 * real backend (posts/comments/reactions/messaging tables + RLS) already
 * exists and is fully built on web; wiring the mobile UI to it is tracked
 * as explicit next-phase work in the mobile build report, not silently
 * skipped.
 */
export function ComingSoonScreen({ title, message }: { title: string; message: string }) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-bg-void px-8">
      <Text className="text-center font-display text-xl font-bold uppercase text-white">{title}</Text>
      <Text className="text-center text-sm text-text-muted">{message}</Text>
    </SafeAreaView>
  );
}
