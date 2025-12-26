import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
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
  // Always use wrapper View for background color and border
  // GlassView/BlurView doesn't handle background colors from className properly
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
