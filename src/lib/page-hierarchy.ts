export type PageIntent = "discover" | "react" | "manage";

export const surfaceShellClassName =
  "rounded-2xl border border-border bg-card shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-none";
export const pageShellClassName = `${surfaceShellClassName} p-6`;
export const insetShellClassName = "rounded-2xl border p-4";
export const eyebrowBaseClassName = "text-[11px] font-semibold uppercase tracking-[0.16em]";
/** Semantische Textfarben (foreground / muted-foreground) aus globals.css / shadcn-Theme. */
export const pageTitleClassName = "mt-2 text-2xl font-semibold tracking-tight text-foreground";
export const pageLeadClassName = "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground";
export const pageMetaClassName = "mt-1 text-xs text-muted-foreground";
export const sectionTitleClassName = "mt-2 text-lg font-semibold tracking-tight text-foreground";
export const sectionBodyClassName = "mt-2 text-sm leading-6 text-muted-foreground";
export const statLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
export const statValueClassName = "mt-1 text-xl font-semibold text-foreground";
export const detailLabelClassName = "text-sm font-semibold text-foreground";
export const detailBodyClassName = "mt-1 text-sm leading-6 text-foreground";

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
        eyebrowClassName: `${eyebrowBaseClassName} text-muted-foreground`,
      };
  }
}
