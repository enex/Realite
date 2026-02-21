import { getBusyWindows, insertSuggestionIntoCalendar } from "@/src/lib/google-calendar";
import {
  getUserSuggestionSettings,
  listSuggestionStatesForUser,
  listVisibleEventsForUser,
  markSuggestionInserted,
  type VisibleEvent,
  upsertSuggestion,
  getTagPreferenceMap
} from "@/src/lib/repository";

const AUTO_INSERT_MIN_SCORE = 1.5;

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function scoreEvent(event: VisibleEvent, preferences: Map<string, { weight: number; votes: number }>) {
  let score = 1;

  for (const tag of event.tags) {
    const preference = preferences.get(tag);
    if (preference) {
      score += preference.weight;
    } else {
      score += 0.35;
    }
  }

  if (event.tags.some((tag) => tag.includes("#alle"))) {
    score += 0.2;
  }

  return Number(score.toFixed(2));
}

export async function buildAvailabilityMap(userId: string, events: VisibleEvent[]) {
  if (!events.length) {
    return new Map<string, boolean>();
  }

  const sorted = [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const minStart = sorted[0].startsAt;
  const maxEnd = sorted[sorted.length - 1].endsAt;
  const busyWindows = await getBusyWindows({ userId, timeMin: minStart, timeMax: maxEnd });

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
  const candidateEvents = events.filter((event) => event.createdBy !== userId && event.startsAt > new Date());

  if (!candidateEvents.length) {
    return [];
  }

  const [preferences, availabilityMap, existingSuggestions, settings] = await Promise.all([
    getTagPreferenceMap(userId),
    buildAvailabilityMap(userId, candidateEvents),
    listSuggestionStatesForUser(userId),
    getUserSuggestionSettings(userId)
  ]);

  const existingByEvent = new Map(existingSuggestions.map((entry) => [entry.eventId, entry]));
  const createdSuggestions = [] as Awaited<ReturnType<typeof upsertSuggestion>>[];

  for (const event of candidateEvents) {
    const isAvailable = availabilityMap.get(event.id) ?? true;
    if (!isAvailable) {
      continue;
    }

    const score = scoreEvent(event, preferences);
    if (score < 1.25) {
      continue;
    }

    const suggestion = await upsertSuggestion({
      userId,
      eventId: event.id,
      score,
      reason: `Match auf ${event.tags.join(", ")} und freie Zeit im Kalender`,
      status: existingByEvent.get(event.id)?.status ?? "pending"
    });

    const existing = existingByEvent.get(event.id);

    if (settings.autoInsertSuggestions && score >= AUTO_INSERT_MIN_SCORE && !existing?.calendarEventId) {
      try {
        const calendarEventId = await insertSuggestionIntoCalendar({
          userId,
          suggestionId: suggestion.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          calendarId: settings.suggestionCalendarId
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
