import {
  ensureSuggestionNonBusyInCalendar,
  getBusyWindows,
  insertSuggestionIntoCalendar,
  removeSuggestionCalendarEvent
} from "@/src/lib/google-calendar";
import {
  getUserSuggestionSettings,
  listSuggestionStatesForUser,
  listVisibleEventsForUser,
  markSuggestionInserted,
  removeSuggestionsForUserByEventIds,
  type VisibleEvent,
  upsertSuggestion,
  getTagPreferenceMap
} from "@/src/lib/repository";
import { getEventPreferenceTags } from "@/src/lib/suggestion-feedback";

const AUTO_INSERT_MIN_SCORE = 1.5;
const SCORE_THRESHOLD = 1.25;

type ScoreContribution = {
  label: string;
  value: number;
};

function parseSourceCalendarId(sourceProvider: string | null, sourceEventId: string | null) {
  if (sourceProvider !== "google" || !sourceEventId) {
    return null;
  }

  const separatorIndex = sourceEventId.lastIndexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  return sourceEventId.slice(0, separatorIndex);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function formatTimeslotLabel(tag: string) {
  const raw = tag.slice("timeslot:".length);
  const [weekdayRaw, hourRaw] = raw.split(":");
  const weekday = Number.parseInt(weekdayRaw ?? "", 10);
  const hour = Number.parseInt(hourRaw ?? "", 10);
  const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  if (!Number.isInteger(weekday) || !Number.isInteger(hour)) {
    return "passendes Zeitfenster";
  }

  return `${weekdays[weekday] ?? "Tag"} ${String(hour).padStart(2, "0")}:00`;
}

function formatContributionLabel(tag: string) {
  if (tag.startsWith("person:")) {
    return "passende Person";
  }

  if (tag.startsWith("timeslot:")) {
    return `Zeitfenster ${formatTimeslotLabel(tag)}`;
  }

  if (tag.startsWith("location:")) {
    return "passender Ort";
  }

  if (tag.startsWith("#")) {
    return `Aktivität ${tag.slice(1)}`;
  }

  return "passendes Signal";
}

function buildSuggestionReason(contributions: ScoreContribution[]) {
  const topPositive = contributions
    .filter((contribution) => contribution.value > 0.15)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!topPositive.length) {
    return "Match basierend auf deinen bisherigen Entscheidungen und freier Zeit im Kalender";
  }

  const details = topPositive
    .map((contribution) => `${contribution.label} (+${contribution.value.toFixed(2)})`)
    .join(", ");
  return `Top-Faktoren: ${details}`;
}

function getUtcDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getUtcWeekKey(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function applySuggestionLimits(
  candidates: Array<{ event: VisibleEvent; score: number; reason: string }>,
  limitPerDay: number,
  limitPerWeek: number
) {
  const byDay = new Map<string, number>();
  const byWeek = new Map<string, number>();
  const selected = [] as Array<{ event: VisibleEvent; score: number; reason: string }>;

  for (const candidate of candidates) {
    const dayKey = getUtcDayKey(candidate.event.startsAt);
    const weekKey = getUtcWeekKey(candidate.event.startsAt);
    const dayCount = byDay.get(dayKey) ?? 0;
    const weekCount = byWeek.get(weekKey) ?? 0;

    if (dayCount >= limitPerDay || weekCount >= limitPerWeek) {
      continue;
    }

    selected.push(candidate);
    byDay.set(dayKey, dayCount + 1);
    byWeek.set(weekKey, weekCount + 1);
  }

  return selected;
}

function scoreEvent(event: VisibleEvent, preferences: Map<string, { weight: number; votes: number }>) {
  let score = 1;
  const contributions = [] as ScoreContribution[];

  for (const tag of event.tags) {
    const preference = preferences.get(tag);
    const label = formatContributionLabel(tag);
    if (preference) {
      score += preference.weight;
      contributions.push({ label, value: preference.weight });
    } else {
      score += 0.35;
      contributions.push({ label, value: 0.35 });
    }
  }

  if (event.tags.some((tag) => tag.includes("#alle"))) {
    score += 0.2;
    contributions.push({ label: "öffentliche Gruppe alle", value: 0.2 });
  }

  const contextTags = getEventPreferenceTags({
    createdBy: event.createdBy,
    startsAt: event.startsAt,
    location: event.location
  });

  for (const tag of contextTags) {
    const preference = preferences.get(tag);
    if (preference) {
      score += preference.weight;
      contributions.push({ label: formatContributionLabel(tag), value: preference.weight });
    }
  }

  return {
    score: Number(score.toFixed(2)),
    reason: buildSuggestionReason(contributions)
  };
}

export async function buildAvailabilityMap(userId: string, events: VisibleEvent[]) {
  if (!events.length) {
    return new Map<string, boolean>();
  }

  const sorted = [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const minStart = sorted[0].startsAt;
  const maxEnd = sorted[sorted.length - 1].endsAt;
  let busyWindows = await getBusyWindows({ userId, timeMin: minStart, timeMax: maxEnd });

  if (busyWindows === null) {
    const map = new Map<string, boolean>();
    for (const event of events) {
      map.set(event.id, false);
    }
    return map;
  }

  const map = new Map<string, boolean>();

  for (const event of events) {
    const conflict = busyWindows.some((window) =>
      overlaps(event.startsAt, event.endsAt, new Date(window.start), new Date(window.end))
    );

    map.set(event.id, !conflict);
  }

  return map;
}

export async function generateSuggestions(userId: string) {
  const events = await listVisibleEventsForUser(userId);
  const candidateEvents = events.filter(
    (event) =>
      event.createdBy !== userId &&
      event.startsAt > new Date() &&
      !/^\[realite\]/iu.test(event.title.trim())
  );

  if (!candidateEvents.length) {
    return [];
  }

  const [preferences, existingSuggestions, settings] = await Promise.all([
    getTagPreferenceMap(userId),
    listSuggestionStatesForUser(userId),
    getUserSuggestionSettings(userId)
  ]);
  const blockedCreatorIds = new Set(settings.blockedCreatorIds);
  const blockedActivityTags = new Set(settings.blockedActivityTags);
  const blockFilteredEvents = candidateEvents.filter(
    (event) =>
      !blockedCreatorIds.has(event.createdBy) &&
      !event.tags.some((tag) => blockedActivityTags.has(tag))
  );
  const availabilityMap = await buildAvailabilityMap(userId, blockFilteredEvents);

  const keptCandidates = [] as Array<{ event: VisibleEvent; score: number; reason: string }>;

  for (const event of blockFilteredEvents) {
    const isAvailable = availabilityMap.get(event.id) ?? true;
    if (!isAvailable) {
      continue;
    }

    const scored = scoreEvent(event, preferences);
    if (scored.score < SCORE_THRESHOLD) {
      continue;
    }

    keptCandidates.push({ event, score: scored.score, reason: scored.reason });
  }

  const limitedCandidates = applySuggestionLimits(
    keptCandidates.sort((a, b) => b.score - a.score || a.event.startsAt.getTime() - b.event.startsAt.getTime()),
    settings.suggestionLimitPerDay,
    settings.suggestionLimitPerWeek
  );

  const desiredEventIds = new Set(limitedCandidates.map((item) => item.event.id));
  const staleSuggestions = existingSuggestions.filter((entry) => !desiredEventIds.has(entry.eventId));

  if (staleSuggestions.length) {
    for (const stale of staleSuggestions) {
      if (!stale.calendarEventId) {
        continue;
      }

      await removeSuggestionCalendarEvent({
        userId,
        calendarEventRef: stale.calendarEventId,
        preferredCalendarId: settings.suggestionCalendarId
      });
    }

    await removeSuggestionsForUserByEventIds({
      userId,
      eventIds: staleSuggestions.map((entry) => entry.eventId)
    });
  }

  const existingByEvent = new Map(
    existingSuggestions
      .filter((entry) => desiredEventIds.has(entry.eventId))
      .map((entry) => [entry.eventId, entry])
  );
  const createdSuggestions = [] as Awaited<ReturnType<typeof upsertSuggestion>>[];

  for (const candidate of limitedCandidates) {
    const suggestion = await upsertSuggestion({
      userId,
      eventId: candidate.event.id,
      score: candidate.score,
      reason: candidate.reason,
      status: existingByEvent.get(candidate.event.id)?.status ?? "pending"
    });

    const existing = existingByEvent.get(candidate.event.id);

    if (existing?.calendarEventId && (existing.status === "pending" || existing.status === "calendar_inserted")) {
      await ensureSuggestionNonBusyInCalendar({
        userId,
        calendarEventRef: existing.calendarEventId,
        eventId: candidate.event.id
      });
    }

    if (settings.autoInsertSuggestions && candidate.score >= AUTO_INSERT_MIN_SCORE && !existing?.calendarEventId) {
      const sourceCalendarId = parseSourceCalendarId(candidate.event.sourceProvider, candidate.event.sourceEventId);
      try {
        const calendarEventId = await insertSuggestionIntoCalendar({
          userId,
          suggestionId: suggestion.id,
          eventId: candidate.event.id,
          title: candidate.event.title,
          description: candidate.event.description,
          location: candidate.event.location,
          startsAt: candidate.event.startsAt,
          endsAt: candidate.event.endsAt,
          calendarId: settings.suggestionCalendarId,
          blockedCalendarIds: sourceCalendarId ? [sourceCalendarId] : [],
          linkType: "suggestion"
        });

        if (calendarEventId) {
          await markSuggestionInserted(suggestion.id, calendarEventId);
        }
      } catch (error) {
        console.error(
          `Kalendereintrag für Suggestion ${suggestion.id} fehlgeschlagen`,
          error instanceof Error ? error.message : error
        );
        // Ein reiner Kalender-Fehler soll den Suggestion-Flow nicht blockieren.
      }
    }

    createdSuggestions.push(suggestion);
  }

  return createdSuggestions;
}
