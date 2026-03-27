export type VisualPriority = "reaction" | "momentum" | "planning" | "neutral";

const NEUTRAL_VISUAL_PRIORITY_META = {
  sectionClassName: "border-slate-200 bg-slate-50/60 shadow-sm",
  itemClassName: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
  insetClassName: "border-slate-200 bg-white/80",
  mutedInsetClassName: "border-dashed border-slate-200 bg-white/80",
  badgeClassName: "bg-white text-slate-700 ring-1 ring-slate-200",
  eyebrowClassName: "text-slate-500",
  accentTextClassName: "text-slate-700",
  actionRowClassName: "border-slate-200 bg-white text-slate-700",
  statClassName: "border-slate-200 bg-white",
};

export function getVisualPriorityMeta(priority: VisualPriority) {
  switch (priority) {
    case "reaction":
      return {
        sectionClassName: "border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm",
        itemClassName: "border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50/70",
        insetClassName: "border-amber-200 bg-amber-50/70",
        mutedInsetClassName: "border-dashed border-amber-300 bg-white/80",
        badgeClassName: "bg-amber-100 text-amber-900",
        eyebrowClassName: "text-amber-700",
        accentTextClassName: "text-amber-800",
        actionRowClassName: "border-amber-200 bg-white text-amber-900",
        statClassName: "border-amber-200 bg-white/80",
      };
    case "momentum":
      return {
        sectionClassName: "border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm",
        itemClassName: "border-teal-200 bg-white hover:border-teal-300 hover:bg-teal-50/60",
        insetClassName: "border-teal-200 bg-teal-50/70",
        mutedInsetClassName: "border-dashed border-teal-200 bg-white/80",
        badgeClassName: "bg-white text-teal-800 ring-1 ring-teal-200",
        eyebrowClassName: "text-teal-700",
        accentTextClassName: "text-teal-800",
        actionRowClassName: "border-teal-200 bg-white text-teal-900",
        statClassName: "border-teal-200 bg-white/80",
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
