import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassSurface, type GlassSurfaceProps } from "./glass";

export type GlassCardProps = GlassSurfaceProps & {
  padded?: boolean;
};

export function GlassCard({
  padded = true,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <GlassSurface
      intensity={props.intensity ?? 55}
      tint={props.tint ?? "default"}
      borderColor={props.borderColor}
      className={cn(
        "rounded-3xl bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20",
        padded && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

