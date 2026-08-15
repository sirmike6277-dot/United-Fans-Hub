import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Standard screen wrapper: safe-area + keyboard-avoiding + scroll. Used by
 * every screen so composer/form screens behave correctly when the Android
 * keyboard opens (content stays visible, doesn't get covered) without each
 * screen re-implementing the same KeyboardAvoidingView boilerplate.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-bg-void" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <Container
          className={padded ? "flex-1 px-5" : "flex-1"}
          {...(scroll
            ? { contentContainerStyle: { flexGrow: 1 }, keyboardShouldPersistTaps: "handled" as const }
            : {})}
        >
          {children}
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
