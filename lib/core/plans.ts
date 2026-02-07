import {
  locationOptionsMatch,
  locationsMatch,
  mergeLocations,
  normalizeOptions,
} from "./location";
import { Plan, PlanLocationOption, PlanTimeOption } from "./types";

export const DEFAULT_EXECUTION_THRESHOLD = 0.65;
export const MAX_SPECIFICITY = 13;

export function normalizeCertainty(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function willLikelyExecute(
  plan: Plan,
  threshold: number = DEFAULT_EXECUTION_THRESHOLD
): boolean {
  return normalizeCertainty(plan.certainty) >= threshold;
}

export function getTimeOptions(plan: Plan): PlanTimeOption[] {
  if (plan.whenOptions && plan.whenOptions.length > 0) return plan.whenOptions;
  if (!plan.when) return [];
  return [{ id: "default-time", start: plan.when.start, end: plan.when.end }];
}

export function getLocationOptions(plan: Plan): PlanLocationOption[] {
  if (plan.whereOptions && plan.whereOptions.length > 0) return plan.whereOptions;
  if (!plan.where) return [];
  return normalizeOptions(plan.where);
}

export function getSelectedTimeOption(plan: Plan): PlanTimeOption | undefined {
  const options = getTimeOptions(plan);
  if (options.length === 0) return undefined;
  if (plan.selectedWhenOptionId) {
    const selected = options.find((x) => x.id === plan.selectedWhenOptionId);
    if (selected) return selected;
  }
  return options[0];
}

export function getSelectedLocationOption(
  plan: Plan,
): PlanLocationOption | undefined {
  const options = getLocationOptions(plan);
  if (options.length === 0) return undefined;
  if (plan.selectedWhereOptionId) {
    const selected = options.find((x) => x.id === plan.selectedWhereOptionId);
    if (selected) return selected;
  }
  return options[0];
}

function parseIso(value: string): number | null {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function timeOptionsOverlap(a: PlanTimeOption, b: PlanTimeOption): boolean {
  const aStart = parseIso(a.start);
  const aEnd = parseIso(a.end);
  const bStart = parseIso(b.start);
  const bEnd = parseIso(b.end);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) {
    // If one side is malformed, avoid false negatives in matching.
    return true;
  }
  return aStart <= bEnd && bStart <= aEnd;
}

export function timesMatch(a: Plan, b: Plan): boolean {
  const timesA = getTimeOptions(a);
  const timesB = getTimeOptions(b);
  if (timesA.length === 0 || timesB.length === 0) return true;
  return timesA.some((x) => timesB.some((y) => timeOptionsOverlap(x, y)));
}

export function isOpenInvitation(plan: Plan): boolean {
  const visibility = plan.participation?.visibility;
  if (visibility === "public" || visibility === "contacts") return true;
  if (visibility === "specific") {
    return (plan.participation?.targetUsers?.length ?? 0) > 0;
  }
  return false;
}

export function isCollaborativePlan(plan: Plan): boolean {
  if (plan.participation?.mode && plan.participation.mode !== "personal") {
    return true;
  }
  if ((plan.participation?.targetUsers?.length ?? 0) > 0) return true;
  if ((plan.who?.explicit?.length ?? 0) > 0) return true;
  if ((plan.participation?.maxParticipants ?? 0) > 1) return true;
  return false;
}

export function isPlanExpired(plan: Plan, now: Date = new Date()): boolean {
  const expiresAt = plan.lifecycle?.expiresAt ?? plan.reminders?.expiresAt;
  if (!expiresAt) return false;
  const expiresTs = parseIso(expiresAt);
  if (expiresTs == null) return false;
  return expiresTs <= now.getTime();
}

export function classifyByCertainty(
  plan: Plan,
  thresholds: { intentMax?: number; commitmentMin?: number } = {},
): "intent" | "candidate" | "commitment" {
  const intentMax = normalizeCertainty(thresholds.intentMax ?? 0.59);
  const commitmentMin = normalizeCertainty(thresholds.commitmentMin ?? 0.8);
  const certainty = normalizeCertainty(plan.certainty);
  if (certainty < intentMax) return "intent";
  if (certainty >= commitmentMin) return "commitment";
  return "candidate";
}

export function readinessScore(
  plan: Plan,
  weights: { certaintyWeight?: number; specificityWeight?: number } = {},
): number {
  const certaintyWeight = Math.max(0, weights.certaintyWeight ?? 0.7);
  const specificityWeight = Math.max(0, weights.specificityWeight ?? 0.3);
  const total = certaintyWeight + specificityWeight || 1;
  const cw = certaintyWeight / total;
  const sw = specificityWeight / total;
  return (
    normalizeCertainty(plan.certainty) * cw +
    normalizeSpecificity(specificity(plan)) * sw
  );
}

export function plansMatch(a: Plan, b: Plan): boolean {
  if (!timesMatch(a, b)) return false;
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
  const timeOptions = getTimeOptions(plan);
  if (timeOptions.length > 0) score += 2;
  if (plan.selectedWhenOptionId || (plan.when && !plan.whenOptions?.length)) {
    score += 1;
  }
  if (plan.what) {
    if (plan.what.category) score += 1;
    if (plan.what.activity) score += 1;
    if (plan.what.title) score += 1;
  }
  const locationOptions = getLocationOptions(plan);
  if (locationOptions.length > 0) score += 2;
  if (
    plan.selectedWhereOptionId ||
    (plan.where && !plan.whereOptions?.length)
  ) {
    score += 1;
  }
  if (plan.who) score += 1;
  if (plan.participation) score += 1;
  if (plan.recurrence) score += 1;
  if (plan.gathering) score += 1;
  return score;
}

export function normalizeSpecificity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= MAX_SPECIFICITY) return 1;
  return value / MAX_SPECIFICITY;
}

export function combinePlans<P extends Plan>(base: P, ...plans: Plan[]): P {
  const combined = {
    ...base,
    certainty: normalizeCertainty(base.certainty),
    when: base.when ? { ...base.when } : undefined,
    whenOptions: base.whenOptions?.map((x) => ({ ...x })),
    whereOptions: base.whereOptions?.map((x) => ({ ...x })),
    participation: base.participation ? { ...base.participation } : undefined,
    collaboration: base.collaboration ? { ...base.collaboration } : undefined,
    lifecycle: base.lifecycle ? { ...base.lifecycle } : undefined,
    reminders: base.reminders ? { ...base.reminders } : undefined,
    discovery: base.discovery ? { ...base.discovery } : undefined,
  };
  for (const plan of plans) {
    if (plan.when) {
      if (combined.when) {
        const start = maxDate(combined.when.start, plan.when.start);
        const end = minDate(combined.when.end, plan.when.end);
        const startTs = parseIso(start);
        const endTs = parseIso(end);
        if (startTs != null && endTs != null && startTs > endTs) {
          combined.when = undefined;
          combined.certainty = 0;
        } else {
          combined.when = { start, end };
        }
      } else {
        combined.when = { ...plan.when };
      }
    }
    if (plan.whenOptions?.length) {
      if (combined.whenOptions?.length) {
        const intersected = combined.whenOptions.flatMap((left) =>
          plan.whenOptions!.flatMap((right) => {
            if (!timeOptionsOverlap(left, right)) return [];
            const start = maxDate(left.start, right.start);
            const end = minDate(left.end, right.end);
            const startTs = parseIso(start);
            const endTs = parseIso(end);
            if (startTs == null || endTs == null || startTs > endTs) return [];
            return [
              {
                id: [left.id, right.id].filter(Boolean).join("+") || undefined,
                label: right.label ?? left.label,
                start,
                end,
              } satisfies PlanTimeOption,
            ];
          }),
        );
        if (intersected.length > 0) {
          combined.whenOptions = dedupeTimeOptions(intersected);
          const selected = combined.whenOptions[0];
          if (selected) {
            combined.when = { start: selected.start, end: selected.end };
            combined.selectedWhenOptionId = selected.id;
          }
        } else {
          combined.whenOptions = [];
          combined.when = undefined;
          combined.selectedWhenOptionId = undefined;
          combined.certainty = 0;
        }
      } else {
        combined.whenOptions = plan.whenOptions.map((x) => ({ ...x }));
        if (!combined.when) {
          const selected = combined.whenOptions[0];
          if (selected) {
            combined.when = { start: selected.start, end: selected.end };
            combined.selectedWhenOptionId = selected.id;
          }
        }
      }
    }
    if (plan.what) combined.what = plan.what;
    if (plan.where)
      combined.where = combined.where
        ? mergeLocations(combined.where, plan.where)
        : plan.where;
    if (plan.whereOptions?.length) {
      if (combined.whereOptions?.length) {
        const intersected = combined.whereOptions.filter((left) =>
          plan.whereOptions!.some((right) => locationOptionsMatch(left, right)),
        );
        if (intersected.length > 0) {
          combined.whereOptions = intersected.map((x) => ({ ...x }));
          const selected = combined.whereOptions[0];
          if (selected) {
            combined.where = selected;
            combined.selectedWhereOptionId = selected.id;
          }
        } else {
          combined.whereOptions = [];
          combined.where = undefined;
          combined.selectedWhereOptionId = undefined;
          combined.certainty = 0;
        }
      } else {
        combined.whereOptions = plan.whereOptions.map((x) => ({ ...x }));
        if (!combined.where) {
          const selected = combined.whereOptions[0];
          if (selected) {
            combined.where = selected;
            combined.selectedWhereOptionId = selected.id;
          }
        }
      }
    }
    if (plan.selectedWhenOptionId) {
      combined.selectedWhenOptionId = plan.selectedWhenOptionId;
    }
    if (plan.selectedWhereOptionId) {
      combined.selectedWhereOptionId = plan.selectedWhereOptionId;
    }
    if (plan.timeZone) combined.timeZone = plan.timeZone;
    if (plan.who) combined.who = plan.who;
    if (plan.participation) {
      combined.participation = {
        ...(combined.participation ?? {}),
        ...plan.participation,
      };
    }
    if (plan.recurrence) combined.recurrence = plan.recurrence;
    if (plan.gathering) combined.gathering = plan.gathering;
    if (plan.collaboration) {
      combined.collaboration = {
        ...(combined.collaboration ?? {}),
        ...plan.collaboration,
      };
    }
    if (plan.lifecycle) {
      combined.lifecycle = {
        ...(combined.lifecycle ?? {}),
        ...plan.lifecycle,
      };
    }
    if (plan.reminders) {
      combined.reminders = {
        ...(combined.reminders ?? {}),
        ...plan.reminders,
      };
    }
    if (plan.discovery) {
      combined.discovery = {
        ...(combined.discovery ?? {}),
        ...plan.discovery,
      };
    }
    if (typeof plan.certainty === "number")
      combined.certainty = normalizeCertainty(
        combined.certainty * normalizeCertainty(plan.certainty)
      );
  }
  return combined;
}

function dedupeTimeOptions(options: PlanTimeOption[]): PlanTimeOption[] {
  const seen = new Set<string>();
  const result: PlanTimeOption[] = [];
  for (const option of options) {
    const key = `${option.start}|${option.end}|${option.id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }
  return result;
}

export function selectPlanOptions(
  plan: Plan,
  selection: { whenOptionId?: string; whereOptionId?: string } = {},
): Plan {
  const selectedTime = selection.whenOptionId
    ? getTimeOptions(plan).find((x) => x.id === selection.whenOptionId)
    : getSelectedTimeOption(plan);
  const selectedLocation = selection.whereOptionId
    ? getLocationOptions(plan).find((x) => x.id === selection.whereOptionId)
    : getSelectedLocationOption(plan);

  return {
    ...plan,
    when: selectedTime
      ? { start: selectedTime.start, end: selectedTime.end }
      : plan.when,
    selectedWhenOptionId: selectedTime?.id ?? plan.selectedWhenOptionId,
    where: selectedLocation ? selectedLocation : plan.where,
    selectedWhereOptionId: selectedLocation?.id ?? plan.selectedWhereOptionId,
  };
}

function minDate(a: string, b: string): string {
  return new Date(a).getTime() < new Date(b).getTime() ? a : b;
}

function maxDate(a: string, b: string): string {
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}
