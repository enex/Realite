import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
import { type GlassSurfaceProps } from "./Glass";

export type GlassCardProps = GlassSurfaceProps & {
  padded?: boolean;
};

export function Card({ className, children, borderColor, ...props }: GlassCardProps) {
  // On iOS, use a simple View like Android for consistency
  // The blur effect doesn't work well with background colors, so we use a semi-transparent background instead
  return (
    <View
      className={cn(
        "rounded-3xl bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20",
        className
      )}
      style={borderColor ? { borderColor } : undefined}
    >
      {children}
    </View>
  );
}
