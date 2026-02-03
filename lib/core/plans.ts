import { locationsMatch, mergeLocations } from "./location";
import { Plan } from "./types";

export function plansMatch(a: Plan, b: Plan): boolean {
  if (a.what && b.what) {
    if (
      a.what.category &&
      b.what.category &&
      a.what.category !== b.what.category
    )
      return false;
    if (
      a.what.activity &&
      b.what.activity &&
      a.what.activity !== b.what.activity
    )
      return false;
  }
  if (a.where && b.where && !locationsMatch(a.where, b.where)) return false;
  return true;
}

export function specificity(plan: Plan): number {
  let score = 0;
  if (plan.when) score += 2;
  if (plan.what) {
    if (plan.what.category) score += 1;
    if (plan.what.activity) score += 1;
  }
  if (plan.where) score += 2;
  if (plan.who) score += 2;
  return score;
}

export function combinePlans<P extends Plan>(base: P, ...plans: Plan[]): P {
  const combined = { certainty: 1, ...base };
  for (const plan of plans) {
    if (plan.when) {
      if (combined.when) {
        combined.when.start = maxDate(combined.when.start, plan.when.start);
        combined.when.end = minDate(combined.when.end, plan.when.end);
      } else {
        combined.when = plan.when;
      }
    }
    if (plan.what) combined.what = plan.what;
    if (plan.where)
      combined.where = combined.where
        ? mergeLocations(combined.where, plan.where)
        : plan.where;
    if (plan.who) combined.who = plan.who;
    if (typeof plan.certainty === "number")
      combined.certainty *= plan.certainty ?? 1;
  }
  return combined;
}

function minDate(a: string, b: string): string {
  return new Date(a).getTime() < new Date(b).getTime() ? a : b;
}

function maxDate(a: string, b: string): string {
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}
