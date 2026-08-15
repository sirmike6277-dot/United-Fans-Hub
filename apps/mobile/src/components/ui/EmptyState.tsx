import { Text, View } from "react-native";

/** Honest "nothing here yet" state — never fabricated placeholder content. Ported convention from the web app's EmptyState.tsx. */
export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View className="items-center gap-1.5 rounded-card border border-white/10 bg-bg-surface px-5 py-8">
      <Text className="text-center text-sm font-semibold text-white">{title}</Text>
      <Text className="text-center text-sm text-text-muted">{message}</Text>
    </View>
  );
}
