export type VisualPriority = "reaction" | "momentum" | "planning" | "neutral";

const NEUTRAL_VISUAL_PRIORITY_META = {
  sectionClassName: "border-slate-200 bg-slate-50/60 shadow-sm",
  itemClassName: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
  insetClassName: "border-slate-200 bg-white/80 dark:border-white/12 dark:bg-[var(--app-surface)]",
  mutedInsetClassName: "border-dashed border-slate-200 bg-white/80 dark:border-white/12 dark:bg-[var(--app-surface)]",
  badgeClassName: "bg-white text-slate-700 ring-1 ring-slate-200",
  eyebrowClassName: "text-slate-500",
  accentTextClassName: "text-slate-700",
  actionRowClassName: "border-slate-200 bg-white text-slate-700",
  statClassName: "border-slate-200 bg-white",
};

export function getVisualPriorityMeta(priority: VisualPriority) {
  switch (priority) {
    case "reaction":
      /* Light: warm amber. Dark: neutrale App-Oberfläche — keine invertierten dark:text-amber-200/-100 (wären dunkel). */
      return {
        sectionClassName:
          "border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:bg-none dark:shadow-none",
        itemClassName:
          "border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50/70 dark:border-white/12 dark:bg-white/5 dark:hover:bg-white/[0.07]",
        insetClassName:
          "border-amber-200 bg-amber-50/70 dark:border-white/10 dark:bg-black/25",
        mutedInsetClassName:
          "border-dashed border-amber-300 bg-white/80 dark:border-white/10 dark:bg-black/20",
        badgeClassName:
          "bg-amber-100 text-amber-900 dark:bg-white/10 dark:text-amber-900",
        eyebrowClassName: "text-amber-700",
        accentTextClassName: "text-amber-800",
        actionRowClassName:
          "border-amber-200 bg-white text-amber-900 dark:border-white/10 dark:bg-[var(--app-surface)] dark:text-amber-900",
        statClassName: "border-amber-200 bg-white/80 dark:border-white/10 dark:bg-black/20",
      };
    case "momentum":
      return {
        sectionClassName:
          "border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:bg-none dark:shadow-none",
        itemClassName:
          "border-teal-200 bg-white hover:border-teal-300 hover:bg-teal-50/60 dark:border-white/12 dark:bg-white/5 dark:hover:border-teal-500/30 dark:hover:bg-teal-950/25",
        insetClassName:
          "border-teal-200 bg-teal-50/70 dark:border-white/10 dark:bg-teal-950/35",
        mutedInsetClassName:
          "border-dashed border-teal-200 bg-white/80 dark:border-teal-500/25 dark:bg-teal-950/20",
        badgeClassName:
          "bg-white text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-900 dark:ring-teal-500/30",
        eyebrowClassName: "text-teal-700",
        accentTextClassName: "text-teal-800",
        actionRowClassName:
          "border-teal-200 bg-white text-teal-900 dark:border-white/12 dark:bg-[var(--app-surface)] dark:text-teal-900",
        statClassName:
          "border-teal-200 bg-white/80 dark:border-white/10 dark:bg-teal-950/30",
      };
    case "planning":
      return {
        sectionClassName: "border-slate-200 bg-white shadow-sm",
        itemClassName: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        insetClassName: "border-slate-200 bg-slate-50/80",
        mutedInsetClassName: "border-dashed border-slate-200 bg-slate-50/80",
        badgeClassName: "bg-slate-100 text-slate-700",
        eyebrowClassName: "text-slate-500",
        accentTextClassName: "text-slate-700",
        actionRowClassName: "border-slate-200 bg-slate-50 text-slate-700",
        statClassName: "border-slate-200 bg-slate-50",
      };
    case "neutral":
      return NEUTRAL_VISUAL_PRIORITY_META;
    default:
      return NEUTRAL_VISUAL_PRIORITY_META;
  }
}
