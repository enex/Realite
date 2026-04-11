export type VisualPriority = "reaction" | "momentum" | "planning" | "neutral";

const NEUTRAL_VISUAL_PRIORITY_META = {
  sectionClassName: "border-border bg-muted/60 shadow-sm",
  itemClassName: "border-border bg-card hover:border-input hover:bg-muted",
  insetClassName: "border-border bg-card/80 dark:border-white/12",
  mutedInsetClassName: "border-dashed border-border bg-card/80 dark:border-white/12",
  badgeClassName: "bg-card text-foreground ring-1 ring-border",
  eyebrowClassName: "text-muted-foreground",
  accentTextClassName: "text-foreground",
  actionRowClassName: "border-border bg-card text-foreground",
  statClassName: "border-border bg-card",
};

export function getVisualPriorityMeta(priority: VisualPriority) {
  switch (priority) {
    case "reaction":
      /* Light: warm amber. Dark: neutrale App-Oberfläche — keine invertierten dark:text-amber-200/-100 (wären dunkel). */
      return {
        sectionClassName:
          "border-amber-200 bg-gradient-to-br from-amber-50 to-card shadow-sm dark:border-white/12 dark:bg-card dark:bg-none dark:shadow-none",
        itemClassName:
          "border-amber-200 bg-card hover:border-amber-300 hover:bg-amber-50/70 dark:border-white/12 dark:bg-card/5 dark:hover:bg-card/[0.07]",
        insetClassName:
          "border-amber-200 bg-amber-50/70 dark:border-white/10 dark:bg-black/25",
        mutedInsetClassName:
          "border-dashed border-amber-300 bg-card/80 dark:border-white/10 dark:bg-black/20",
        badgeClassName:
          "bg-amber-100 text-amber-900 dark:bg-card/10 dark:text-amber-900",
        eyebrowClassName: "text-amber-700",
        accentTextClassName: "text-amber-800",
        actionRowClassName:
          "border-amber-200 bg-card text-amber-900 dark:border-white/10 dark:text-amber-900",
        statClassName: "border-amber-200 bg-card/80 dark:border-white/10 dark:bg-black/20",
      };
    case "momentum":
      return {
        sectionClassName:
          "border-teal-200 bg-gradient-to-br from-teal-50 to-card shadow-sm dark:border-white/12 dark:bg-card dark:bg-none dark:shadow-none",
        itemClassName:
          "border-teal-200 bg-card hover:border-teal-300 hover:bg-teal-50/60 dark:border-white/12 dark:bg-card/5 dark:hover:border-primary/30 dark:hover:bg-primary/15",
        insetClassName:
          "border-teal-200 bg-teal-50/70 dark:border-white/10 dark:bg-primary/20",
        mutedInsetClassName:
          "border-dashed border-teal-200 bg-card/80 dark:border-primary/25 dark:bg-primary/15",
        badgeClassName:
          "bg-card text-teal-800 ring-1 ring-teal-200 dark:bg-primary/25 dark:text-teal-100 dark:ring-primary/30",
        eyebrowClassName: "text-teal-700",
        accentTextClassName: "text-teal-800",
        actionRowClassName:
          "border-teal-200 bg-card text-teal-900 dark:border-white/12 dark:text-teal-100",
        statClassName:
          "border-teal-200 bg-card/80 dark:border-white/10 dark:bg-primary/20",
      };
    case "planning":
      return {
        sectionClassName: "border-border bg-card shadow-sm",
        itemClassName: "border-border bg-card hover:border-input hover:bg-muted",
        insetClassName: "border-border bg-muted/80",
        mutedInsetClassName: "border-dashed border-border bg-muted/80",
        badgeClassName: "bg-muted text-foreground",
        eyebrowClassName: "text-muted-foreground",
        accentTextClassName: "text-foreground",
        actionRowClassName: "border-border bg-muted text-foreground",
        statClassName: "border-border bg-muted",
      };
    case "neutral":
      return NEUTRAL_VISUAL_PRIORITY_META;
    default:
      return NEUTRAL_VISUAL_PRIORITY_META;
  }
}
