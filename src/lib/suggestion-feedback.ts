export const DECLINE_REASON_VALUES = [
  "not_with_this_person",
  "not_this_activity",
  "no_time",
  "too_far",
  "would_if_changed"
] as const;

export type DeclineReason = (typeof DECLINE_REASON_VALUES)[number];

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  not_with_this_person: "Nicht mit dieser Person",
  not_this_activity: "Nicht diese Aktivität",
  no_time: "Habe da keine Zeit",
  too_far: "Zu weit entfernt",
  would_if_changed: "Wenn folgendes anders wäre ja"
};

const DECLINE_REASON_SET = new Set<string>(DECLINE_REASON_VALUES);

export function normalizeDecisionReasons(reasons: string[] | null | undefined): DeclineReason[] {
  const normalized = (reasons ?? [])
    .map((reason) => reason.trim())
    .filter((reason): reason is DeclineReason => DECLINE_REASON_SET.has(reason));

  return Array.from(new Set(normalized));
}

export function serializeDecisionReasons(reasons: string[] | null | undefined) {
  return normalizeDecisionReasons(reasons).join(",");
}

export function parseDecisionReasons(value: string | null | undefined): DeclineReason[] {
  if (!value) {
    return [];
  }

  return normalizeDecisionReasons(value.split(","));
}

export function normalizeDecisionNote(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized.slice(0, 300) : null;
}

export function createPersonPreferenceTag(userId: string) {
  return `person:${userId}`;
}

export function createTimeslotPreferenceTag(startsAt: Date) {
  const weekday = startsAt.getUTCDay();
  const hour = startsAt.getUTCHours();
  return `timeslot:${weekday}:${hour}`;
}

function normalizeLocation(location: string) {
  return location
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createLocationPreferenceTag(location: string | null | undefined) {
  const normalized = location ? normalizeLocation(location) : "";
  if (!normalized) {
    return null;
  }

  return `location:${normalized}`;
}

export function getEventPreferenceTags(input: { createdBy: string; startsAt: Date; location?: string | null }) {
  const tags = [createPersonPreferenceTag(input.createdBy), createTimeslotPreferenceTag(input.startsAt)];
  const locationTag = createLocationPreferenceTag(input.location);

  if (locationTag) {
    tags.push(locationTag);
  }

  return tags;
}
