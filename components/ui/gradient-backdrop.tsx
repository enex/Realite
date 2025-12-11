import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

export type GradientBackdropProps = ViewProps & {
  variant?: "default" | "warm" | "cool";
};

export function GradientBackdrop({
  variant = "default",
  style,
  ...rest
}: GradientBackdropProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const palettes = {
    default: isDark
      ? ["#050507", "#0B1020", "#140B1F"]
      : ["#F5F7FA", "#FDF2F8", "#ECFEFF"],
    warm: isDark
      ? ["#050507", "#1A0B12", "#0E111B"]
      : ["#F7F7FA", "#FEF3E8", "#FDE7F3"],
    cool: isDark
      ? ["#050507", "#0A1620", "#0A0F1F"]
      : ["#F5F7FA", "#EEF2FF", "#E6FFFB"],
  } as const;

  const colors = palettes[variant];
  const overlayColors = isDark
    ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0)"]
    : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.4)"];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none" {...rest}>
      <LinearGradient
        colors={colors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={overlayColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

