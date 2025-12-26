import { cn } from "@/lib/utils";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Platform, View } from "react-native";
import { Glass, type GlassSurfaceProps } from "./Glass";

export type GlassCardProps = GlassSurfaceProps & {
  padded?: boolean;
};

export function Card({
  className,
  children,
  borderColor,
  ...props
}: GlassCardProps) {
  // If GlassView is available (iOS 26+), we can use it directly without wrapper
  // Otherwise, use wrapper View for background color fallback
  const useGlassView = Platform.OS === "ios" && isLiquidGlassAvailable();

  if (useGlassView) {
    // GlassView handles styling better, so we can pass className directly
    return (
      <Glass
        intensity={props.intensity ?? 55}
        tint={props.tint ?? "default"}
        borderColor={borderColor}
        className={cn(
          "rounded-3xl overflow-hidden bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20",
          className
        )}
        {...props}
      >
        {children}
      </Glass>
    );
  }

  // Fallback: Use wrapper View for background color on older iOS or other platforms
  return (
    <View
      className={cn(
        "rounded-3xl overflow-hidden bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20",
        className
      )}
      style={borderColor ? { borderColor } : undefined}
    >
      <Glass
        intensity={props.intensity ?? 55}
        tint={props.tint ?? "default"}
        style={{ flex: 1 }}
        {...props}
      >
        {children}
      </Glass>
    </View>
  );
}
