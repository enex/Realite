import { cn } from "@/lib/utils";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import {
  Platform,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

export type GlassSurfaceProps = ViewProps & {
  blur?: boolean;
  intensity?: number;
  tint?: string;
  androidFallback?: boolean;
  fallbackBackground?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function Glass({
  blur = true,
  intensity = 60,
  tint = "default",
  androidFallback = false,
  fallbackBackground,
  borderColor,
  className,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const useBlur =
    blur &&
    (Platform.OS === "ios" ||
      Platform.OS === "web" ||
      (Platform.OS === "android" && !androidFallback));

  const fallbackStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor:
        fallbackBackground ??
        (Platform.OS === "web"
          ? "rgba(255,255,255,0.7)"
          : "rgba(255,255,255,0.8)"),
      borderWidth: borderColor ? 1 : undefined,
      borderColor,
    },
    style,
  ];

  if (!useBlur) {
    return (
      <View className={cn(className)} style={fallbackStyle} {...rest}>
        {children}
      </View>
    );
  }

  // Use GlassView on iOS if available (iOS 26+), otherwise fallback to BlurView
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    // Map tint to tintColor for GlassView
    // GlassView supports tintColor as a string (hex color)
    // For default tint, we can use undefined or a light tint
    const tintColor =
      tint === "dark" ? "#000000" : tint === "light" ? "#FFFFFF" : undefined;

    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={tintColor}
        className={cn(className)}
        style={[
          borderColor ? { borderWidth: 1, borderColor } : null,
          style as any,
        ]}
        {...(rest as any)}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      experimentalBlurMethod={
        Platform.OS === "android" ? "dimezisBlurView" : undefined
      }
      className={cn(className)}
      style={[
        borderColor ? { borderWidth: 1, borderColor } : null,
        style as any,
      ]}
      {...(rest as any)}
    >
      {children}
    </BlurView>
  );
}
