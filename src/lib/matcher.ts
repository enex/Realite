import {
  ensureSuggestionNonBusyInCalendar,
  getBusyWindows,
  insertSuggestionAsSourceInvite,
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

const AUTO_INSERT_MIN_SCORE = 1.5;

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

  const [preferences, availabilityMap, existingSuggestions, settings] = await Promise.all([
    getTagPreferenceMap(userId),
    buildAvailabilityMap(userId, candidateEvents),
    listSuggestionStatesForUser(userId),
    getUserSuggestionSettings(userId)
  ]);

  const keptCandidates = [] as Array<{ event: VisibleEvent; score: number }>;

  for (const event of candidateEvents) {
    const isAvailable = availabilityMap.get(event.id) ?? true;
    if (!isAvailable) {
      continue;
    }

    const score = scoreEvent(event, preferences);
    if (score < 1.25) {
      continue;
    }

    keptCandidates.push({ event, score });
  }

  const desiredEventIds = new Set(keptCandidates.map((item) => item.event.id));
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

  for (const candidate of keptCandidates) {
    const suggestion = await upsertSuggestion({
      userId,
      eventId: candidate.event.id,
      score: candidate.score,
      reason: `Match auf ${candidate.event.tags.join(", ")} und freie Zeit im Kalender`,
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
        const shouldTrySourceInvite =
          settings.suggestionDeliveryMode === "source_invite" &&
          settings.shareEmailInSourceInvites &&
          candidate.event.sourceProvider === "google" &&
          Boolean(candidate.event.sourceEventId);

        let calendarEventId: string | null = null;

        if (shouldTrySourceInvite) {
          calendarEventId = await insertSuggestionAsSourceInvite({
            suggestionId: suggestion.id,
            targetUserId: userId,
            sourceOwnerUserId: candidate.event.createdBy,
            sourceEventId: candidate.event.sourceEventId ?? ""
          });
        }

        if (!calendarEventId) {
          calendarEventId = await insertSuggestionIntoCalendar({
            userId,
            suggestionId: suggestion.id,
            eventId: candidate.event.id,
            title: candidate.event.title,
            description: candidate.event.description,
            location: candidate.event.location,
            startsAt: candidate.event.startsAt,
            endsAt: candidate.event.endsAt,
            calendarId: settings.suggestionCalendarId,
            blockedCalendarIds: sourceCalendarId ? [sourceCalendarId] : []
          });
        }

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
