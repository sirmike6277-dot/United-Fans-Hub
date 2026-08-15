import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

/** FanHub's primary CTA styling, ported from the web app's Button.tsx variants. */
export function Button({ children, variant = "primary", loading, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  const base = "flex-row items-center justify-center rounded-control px-5 py-3.5 gap-2";
  const variants = {
    primary: "bg-red-primary active:bg-red-hover",
    secondary: "bg-bg-elevated border border-white/10 active:bg-bg-surface",
    ghost: "bg-transparent active:bg-white/5",
  } as const;
  const textVariants = {
    primary: "text-white",
    secondary: "text-white",
    ghost: "text-red-primary",
  } as const;

  return (
    <Pressable
      className={`${base} ${variants[variant]} ${isDisabled ? "opacity-50" : ""}`}
      disabled={isDisabled}
      accessibilityRole="button"
      {...props}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
      <Text className={`text-center text-base font-bold ${textVariants[variant]}`}>{children}</Text>
    </Pressable>
  );
}
