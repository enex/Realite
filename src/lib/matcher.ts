import {
  googleCalendarProvider,
  type CalendarProvider,
} from "@/src/lib/google-calendar";
import {
  getTagPreferenceMap,
  getUserSuggestionSettings,
  listSuggestionStatesForUser,
  listVisibleEventsForUser,
  markSuggestionInserted,
  removeSuggestionsForUserByEventIds,
  type SuggestionStatus,
  type UserSuggestionSettings,
  type VisibleEvent,
  upsertSuggestion,
} from "@/src/lib/repository";
import { getEventPreferenceTags } from "@/src/lib/suggestion-feedback";
import { systemNow, type NowFn } from "@/src/lib/time";

const AUTO_INSERT_MIN_SCORE = 1.5;
const SCORE_THRESHOLD = 1.25;

type ScoreContribution = {
  label: string;
  value: number;
};

type AvailabilityStatus = "available" | "unavailable" | "unknown";

export type MatcherSuggestionState = {
  id: string;
  eventId: string;
  status: SuggestionStatus;
  calendarEventId: string | null;
};

export type MatcherSuggestionRecord = MatcherSuggestionState & {
  userId: string;
  score: number;
  reason: string;
};

export interface MatcherRepository {
  listVisibleEventsForUser(userId: string): Promise<VisibleEvent[]>;
  getTagPreferenceMap(
    userId: string,
  ): Promise<Map<string, { weight: number; votes: number }>>;
  listSuggestionStatesForUser(userId: string): Promise<MatcherSuggestionState[]>;
  getUserSuggestionSettings(userId: string): Promise<UserSuggestionSettings>;
  removeSuggestionsForUserByEventIds(input: {
    userId: string;
    eventIds: string[];
  }): Promise<number>;
  upsertSuggestion(input: {
    userId: string;
    eventId: string;
    score: number;
    reason: string;
    status?: SuggestionStatus;
  }): Promise<MatcherSuggestionRecord>;
  markSuggestionInserted(
    suggestionId: string,
    calendarEventId: string,
  ): Promise<unknown>;
}

type MatcherDependencies = {
  repository: MatcherRepository;
  calendar: CalendarProvider;
  now: NowFn;
};

function parseSourceCalendarId(
  sourceProvider: string | null,
  sourceEventId: string | null,
) {
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
  const weekdays = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

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

function addContribution(
  contributions: ScoreContribution[],
  label: string,
  value: number,
) {
  contributions.push({ label, value });
  return value;
}

function buildSuggestionReason(
  contributions: ScoreContribution[],
  availabilityStatus: AvailabilityStatus,
) {
  const topPositive = contributions
    .filter((contribution) => contribution.value > 0.15)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const availabilitySuffix =
    availabilityStatus === "unknown"
      ? " Verfügbarkeit gerade ohne Kalenderabgleich geschätzt."
      : "";

  if (!topPositive.length) {
    return availabilityStatus === "unknown"
      ? "Match basierend auf deinen bisherigen Entscheidungen. Verfügbarkeit gerade ohne Kalenderabgleich geschätzt."
      : "Match basierend auf deinen bisherigen Entscheidungen und freier Zeit im Kalender";
  }

  const details = topPositive
    .map(
      (contribution) =>
        `${contribution.label} (+${contribution.value.toFixed(2)})`,
    )
    .join(", ");
  return `Top-Faktoren: ${details}.${availabilitySuffix}`;
}

function getUtcDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getUtcWeekKey(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function applySuggestionLimits(
  candidates: Array<{
    event: VisibleEvent;
    score: number;
    reason: string;
    availabilityStatus: AvailabilityStatus;
  }>,
  limitPerDay: number,
  limitPerWeek: number,
) {
  const byDay = new Map<string, number>();
  const byWeek = new Map<string, number>();
  const selected = [] as Array<{
    event: VisibleEvent;
    score: number;
    reason: string;
    availabilityStatus: AvailabilityStatus;
  }>;

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

function scoreEvent(
  event: VisibleEvent,
  preferences: Map<string, { weight: number; votes: number }>,
  availabilityStatus: AvailabilityStatus,
) {
  let score = 1;
  const contributions = [] as ScoreContribution[];
  let matchedInterestSignal = false;

  for (const tag of event.tags) {
    const preference = preferences.get(tag);
    const label = formatContributionLabel(tag);
    if (preference) {
      score += addContribution(contributions, label, preference.weight);
      matchedInterestSignal = true;
    } else {
      score += addContribution(contributions, label, 0.35);
    }
  }

  if (event.tags.some((tag) => tag.includes("#alle"))) {
    score += addContribution(contributions, "öffentliche Gruppe alle", 0.2);
  }

  const contextTags = getEventPreferenceTags({
    createdBy: event.createdBy,
    startsAt: event.startsAt,
    location: event.location,
  });

  for (const tag of contextTags) {
    const preference = preferences.get(tag);
    if (preference) {
      score += addContribution(
        contributions,
        formatContributionLabel(tag),
        preference.weight,
      );
      matchedInterestSignal = true;
    }
  }

  if (availabilityStatus === "unknown") {
    if (event.groupId) {
      score += addContribution(contributions, "gemeinsamer Kreis", 0.3);
    }

    if (matchedInterestSignal) {
      score += addContribution(
        contributions,
        "explizite Interessen aus deinem Matching",
        0.25,
      );
    } else if (event.tags.length > 0) {
      score += addContribution(
        contributions,
        "klare Aktivität auch ohne Kalenderkontext",
        0.1,
      );
    }

    score -= 0.2;
  }

  return {
    score: Number(Math.max(0, score).toFixed(2)),
    reason: buildSuggestionReason(contributions, availabilityStatus),
  };
}

const defaultMatcherRepository: MatcherRepository = {
  listVisibleEventsForUser,
  getTagPreferenceMap,
  listSuggestionStatesForUser,
  getUserSuggestionSettings,
  removeSuggestionsForUserByEventIds,
  upsertSuggestion: (input) =>
    upsertSuggestion(input) as Promise<MatcherSuggestionRecord>,
  markSuggestionInserted,
};

export function createMatcherService(dependencies: MatcherDependencies) {
  async function buildAvailabilityMap(userId: string, events: VisibleEvent[]) {
    if (!events.length) {
      return new Map<string, AvailabilityStatus>();
    }

    const sorted = [...events].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );
    const minStart = sorted[0].startsAt;
    const maxEnd = sorted[sorted.length - 1].endsAt;
    const busyWindows = await dependencies.calendar.getBusyWindows({
      userId,
      timeMin: minStart,
      timeMax: maxEnd,
    });

    if (busyWindows === null) {
      const map = new Map<string, AvailabilityStatus>();
      for (const event of events) {
        map.set(event.id, "unknown");
      }
      return map;
    }

    const map = new Map<string, AvailabilityStatus>();

    for (const event of events) {
      const conflict = busyWindows.some((window) =>
        overlaps(
          event.startsAt,
          event.endsAt,
          new Date(window.start),
          new Date(window.end),
        ),
      );

      map.set(event.id, conflict ? "unavailable" : "available");
    }

    return map;
  }

  async function generateSuggestions(userId: string) {
    const events = await dependencies.repository.listVisibleEventsForUser(userId);
    const now = dependencies.now();
    const candidateEvents = events.filter(
      (event) =>
        event.createdBy !== userId &&
        event.startsAt > now &&
        !/^\[realite\]/iu.test(event.title.trim()),
    );

    if (!candidateEvents.length) {
      return [] as MatcherSuggestionRecord[];
    }

    const [preferences, existingSuggestions, settings] = await Promise.all([
      dependencies.repository.getTagPreferenceMap(userId),
      dependencies.repository.listSuggestionStatesForUser(userId),
      dependencies.repository.getUserSuggestionSettings(userId),
    ]);
    const blockedCreatorIds = new Set(settings.blockedCreatorIds);
    const blockedActivityTags = new Set(settings.blockedActivityTags);
    const blockFilteredEvents = candidateEvents.filter(
      (event) =>
        !blockedCreatorIds.has(event.createdBy) &&
        !event.tags.some((tag) => blockedActivityTags.has(tag)),
    );
    const availabilityMap = await buildAvailabilityMap(
      userId,
      blockFilteredEvents,
    );

    const keptCandidates = [] as Array<{
      event: VisibleEvent;
      score: number;
      reason: string;
      availabilityStatus: AvailabilityStatus;
    }>;

    for (const event of blockFilteredEvents) {
      const availabilityStatus = availabilityMap.get(event.id) ?? "available";
      if (availabilityStatus === "unavailable") {
        continue;
      }

      const scored = scoreEvent(event, preferences, availabilityStatus);
      if (scored.score < SCORE_THRESHOLD) {
        continue;
      }

      keptCandidates.push({
        event,
        score: scored.score,
        reason: scored.reason,
        availabilityStatus,
      });
    }

    const limitedCandidates = applySuggestionLimits(
      keptCandidates.sort(
        (a, b) =>
          b.score - a.score ||
          a.event.startsAt.getTime() - b.event.startsAt.getTime(),
      ),
      settings.suggestionLimitPerDay,
      settings.suggestionLimitPerWeek,
    );

    const desiredEventIds = new Set(
      limitedCandidates.map((item) => item.event.id),
    );
    const staleSuggestions = existingSuggestions.filter(
      (entry) => !desiredEventIds.has(entry.eventId),
    );

    if (staleSuggestions.length) {
      for (const stale of staleSuggestions) {
        if (!stale.calendarEventId) {
          continue;
        }

        await dependencies.calendar.removeSuggestionCalendarEvent({
          userId,
          calendarEventRef: stale.calendarEventId,
          preferredCalendarId: settings.suggestionCalendarId,
        });
      }

      await dependencies.repository.removeSuggestionsForUserByEventIds({
        userId,
        eventIds: staleSuggestions.map((entry) => entry.eventId),
      });
    }

    const existingByEvent = new Map(
      existingSuggestions
        .filter((entry) => desiredEventIds.has(entry.eventId))
        .map((entry) => [entry.eventId, entry] as const),
    );
    const createdSuggestions = [] as MatcherSuggestionRecord[];

    for (const candidate of limitedCandidates) {
      const suggestion = await dependencies.repository.upsertSuggestion({
        userId,
        eventId: candidate.event.id,
        score: candidate.score,
        reason: candidate.reason,
        status: existingByEvent.get(candidate.event.id)?.status ?? "pending",
      });

      const existing = existingByEvent.get(candidate.event.id);

      if (
        existing?.calendarEventId &&
        (existing.status === "pending" ||
          existing.status === "calendar_inserted")
      ) {
        await dependencies.calendar.ensureSuggestionNonBusyInCalendar({
          userId,
          calendarEventRef: existing.calendarEventId,
          eventId: candidate.event.id,
        });
      }

      if (
        settings.autoInsertSuggestions &&
        candidate.score >= AUTO_INSERT_MIN_SCORE &&
        candidate.availabilityStatus === "available" &&
        !existing?.calendarEventId
      ) {
        const sourceCalendarId = parseSourceCalendarId(
          candidate.event.sourceProvider,
          candidate.event.sourceEventId,
        );
        try {
          const calendarEventId =
            await dependencies.calendar.insertSuggestionIntoCalendar({
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
              linkType: "suggestion",
            });

          if (calendarEventId) {
            await dependencies.repository.markSuggestionInserted(
              suggestion.id,
              calendarEventId,
            );
            suggestion.calendarEventId = calendarEventId;
            suggestion.status = "calendar_inserted";
          }
        } catch (error) {
          console.error(
            `Kalendereintrag für Suggestion ${suggestion.id} fehlgeschlagen`,
            error instanceof Error ? error.message : error,
          );
          // Ein reiner Kalender-Fehler soll den Suggestion-Flow nicht blockieren.
        }
      }

      createdSuggestions.push(suggestion);
    }

    return createdSuggestions;
  }

  return {
    buildAvailabilityMap,
    generateSuggestions,
  };
}

const defaultMatcherService = createMatcherService({
  repository: defaultMatcherRepository,
  calendar: googleCalendarProvider,
  now: systemNow,
});

export async function buildAvailabilityMap(
  userId: string,
  events: VisibleEvent[],
) {
  return defaultMatcherService.buildAvailabilityMap(userId, events);
}

export async function generateSuggestions(userId: string) {
  return defaultMatcherService.generateSuggestions(userId);
}
