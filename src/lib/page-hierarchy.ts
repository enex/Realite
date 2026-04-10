export type PageIntent = "discover" | "react" | "manage";

export const surfaceShellClassName =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-none";
export const pageShellClassName = `${surfaceShellClassName} p-6`;
export const insetShellClassName = "rounded-2xl border p-4";
export const eyebrowBaseClassName = "text-[11px] font-semibold uppercase tracking-[0.16em]";
/** Slate-Tokens sind in globals.css pro Theme gemappt; kein extra dark:text-slate-* (invertierte Skala). */
export const pageTitleClassName = "mt-2 text-2xl font-semibold tracking-tight text-slate-900";
export const pageLeadClassName = "mt-2 max-w-2xl text-sm leading-6 text-slate-600";
export const pageMetaClassName = "mt-1 text-xs text-slate-500";
export const sectionTitleClassName = "mt-2 text-lg font-semibold tracking-tight text-slate-900";
export const sectionBodyClassName = "mt-2 text-sm leading-6 text-slate-600";
export const statLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";
export const statValueClassName = "mt-1 text-xl font-semibold text-slate-900";
export const detailLabelClassName = "text-sm font-semibold text-slate-900";
export const detailBodyClassName = "mt-1 text-sm leading-6 text-slate-700";

export function getPageIntentMeta(intent: PageIntent) {
  switch (intent) {
    case "discover":
      return {
        eyebrowClassName: `${eyebrowBaseClassName} text-teal-700`,
      };
    case "react":
      return {
        eyebrowClassName: `${eyebrowBaseClassName} text-amber-700`,
      };
    case "manage":
      return {
        eyebrowClassName: `${eyebrowBaseClassName} text-slate-500`,
      };
  }
}
