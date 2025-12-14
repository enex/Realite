import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { StyleSheet, useColorScheme } from "react-native";
import { GlassSurface } from "./glass";

export default function GlassTabBarBackground() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <GlassSurface
      intensity={70}
      tint={isDark ? "dark" : "light"}
      androidFallback={false}
      fallbackBackground={
        isDark ? "rgba(24,24,27,0.95)" : "rgba(255,255,255,0.9)"
      }
      borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
