import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { GlassSurface } from "./glass";

export default function GlassTabBarBackground() {
  return (
    <GlassSurface
      intensity={70}
      tint="default"
      androidFallback={false}
      fallbackBackground="rgba(255,255,255,0.9)"
      borderColor="rgba(255,255,255,0.4)"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}

