import { getVisualPriorityMeta, type VisualPriority } from "@/src/lib/visual-priority";

export type CardSurface = "activity" | "suggestion" | "presence" | "smart_meeting";

type CardSurfaceMeta = {
  priority: VisualPriority;
  sectionClassName: string;
  itemClassName: string;
  selectedItemClassName: string;
  insetClassName: string;
  mutedInsetClassName: string;
  statClassName: string;
  badgeClassName: string;
  eyebrowClassName: string;
  accentTextClassName: string;
  actionClassName: string;
};

const SURFACE_PRIORITY: Record<CardSurface, VisualPriority> = {
  activity: "momentum",
  suggestion: "reaction",
  presence: "reaction",
  smart_meeting: "planning"
};

export function getCardSurfaceMeta(surface: CardSurface): CardSurfaceMeta {
  const priority = SURFACE_PRIORITY[surface];
  const visualPriority = getVisualPriorityMeta(priority);

  if (surface === "smart_meeting") {
    return {
      priority,
      sectionClassName: `${visualPriority.sectionClassName} rounded-2xl border p-6`,
      itemClassName: `${visualPriority.itemClassName} rounded-xl border p-4 transition`,
      selectedItemClassName: "rounded-xl border border-teal-400 bg-teal-50 p-4 shadow-sm transition",
      insetClassName: `${visualPriority.insetClassName} rounded-xl border p-4`,
      mutedInsetClassName: `${visualPriority.mutedInsetClassName} rounded-xl border p-4`,
      statClassName: `${visualPriority.statClassName} rounded-xl border p-4`,
      badgeClassName: "bg-slate-100 text-slate-700",
      eyebrowClassName: visualPriority.eyebrowClassName,
      accentTextClassName: visualPriority.accentTextClassName,
      actionClassName: "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
    };
  }

  return {
    priority,
    sectionClassName: `${visualPriority.sectionClassName} rounded-2xl border p-6`,
    itemClassName: `${visualPriority.itemClassName} rounded-xl border p-4 transition`,
    selectedItemClassName: "rounded-xl border border-teal-400 bg-teal-50 p-4 shadow-sm transition",
    insetClassName: `${visualPriority.insetClassName} rounded-xl border p-3`,
    mutedInsetClassName: `${visualPriority.mutedInsetClassName} rounded-xl border p-4`,
    statClassName: `${visualPriority.statClassName} rounded-xl border p-4`,
    badgeClassName: visualPriority.badgeClassName,
    eyebrowClassName: visualPriority.eyebrowClassName,
    accentTextClassName: visualPriority.accentTextClassName,
    actionClassName:
      surface === "presence"
        ? "rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        : "rounded-md border border-teal-200 bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
  };
}
