import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Renders a show/hide toggle and masks input — for password fields. */
  isPassword?: boolean;
}

/** FanHub's labeled text input, ported from the web app's Input/PasswordInput. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, isPassword, secureTextEntry, ...props },
  ref,
) {
  const [reveal, setReveal] = useState(false);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-text-muted">{label}</Text>
      <View className="flex-row items-center rounded-control border border-white/10 bg-bg-elevated px-4">
        <TextInput
          ref={ref}
          className="h-12 flex-1 text-base text-white"
          placeholderTextColor="#A1A1A1"
          secureTextEntry={isPassword ? !reveal : secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {isPassword ? (
          <Pressable onPress={() => setReveal((v) => !v)} hitSlop={8}>
            <Text className="text-xs font-semibold text-text-muted">{reveal ? "HIDE" : "SHOW"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs text-red-hover">{error}</Text> : null}
    </View>
  );
});
