import { cn } from "@/lib/utils";
import * as React from "react";
import { Glass, type GlassSurfaceProps } from "./Glass";

export type GlassCardProps = GlassSurfaceProps & {
  padded?: boolean;
};

export function Card({ className, children, ...props }: GlassCardProps) {
  return (
    <Glass
      intensity={props.intensity ?? 55}
      tint={props.tint ?? "default"}
      borderColor={props.borderColor}
      className={cn(
        "rounded-3xl bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20",
        className
      )}
      {...props}
    >
      {children}
    </Glass>
  );
}
