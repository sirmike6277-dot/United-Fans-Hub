import { type ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export function Card({ children, className = "", ...props }: ViewProps & { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-card border border-white/10 bg-bg-surface p-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
