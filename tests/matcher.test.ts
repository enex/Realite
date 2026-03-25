import { describe, expect, test } from "bun:test";

import { InMemoryCalendarProvider, InMemoryRepository } from "@/src/lib/in-memory-platform";
import { createMatcherService } from "@/src/lib/matcher";
import type { VisibleEvent } from "@/src/lib/repository";

function buildEvent(
  overrides: Partial<VisibleEvent> &
    Pick<VisibleEvent, "id" | "title" | "startsAt" | "endsAt">,
): VisibleEvent {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description ?? null,
    location: overrides.location ?? null,
    startsAt: overrides.startsAt,
    endsAt: overrides.endsAt,
    visibility: overrides.visibility ?? "public",
    joinMode: overrides.joinMode ?? "direct",
    groupId: overrides.groupId ?? null,
    groupName: overrides.groupName ?? null,
    createdBy: overrides.createdBy ?? "other-user",
    sourceProvider: overrides.sourceProvider ?? null,
    sourceEventId: overrides.sourceEventId ?? null,
    color: overrides.color ?? null,
    category: overrides.category ?? "default",
    placeImageUrl: overrides.placeImageUrl ?? null,
    linkPreviewImageUrl: overrides.linkPreviewImageUrl ?? null,
    tags: overrides.tags ?? ["#tennis"],
  };
}

describe("matcher service", () => {
  test("uses injected time and ports to keep only future, available suggestions", async () => {
    const repository = new InMemoryRepository();
    const calendar = new InMemoryCalendarProvider();
    const service = createMatcherService({
      repository,
      calendar,
      now: () => new Date("2026-03-01T12:00:00.000Z"),
    });

    repository.setSuggestionSettings("viewer", {
      autoInsertSuggestions: true,
      suggestionCalendarId: "suggestions",
      suggestionLimitPerDay: 5,
      suggestionLimitPerWeek: 10,
    });
    repository.setTagPreferences(
      "viewer",
      new Map([["#tennis", { weight: 0.8, votes: 4 }]]),
    );

    await repository.upsertSuggestion({
      userId: "viewer",
      eventId: "stale-event",
      score: 1.6,
      reason: "old",
      status: "calendar_inserted",
    });
    const stale = repository.listSuggestionsForUser("viewer")[0];
    stale.calendarEventId = "calendar:stale";

    repository.setVisibleEvents("viewer", [
      buildEvent({
        id: "past-event",
        title: "Vergangen",
        startsAt: new Date("2026-03-01T10:00:00.000Z"),
        endsAt: new Date("2026-03-01T11:00:00.000Z"),
      }),
      buildEvent({
        id: "busy-event",
        title: "Belegt",
        startsAt: new Date("2026-03-01T13:00:00.000Z"),
        endsAt: new Date("2026-03-01T14:00:00.000Z"),
      }),
      buildEvent({
        id: "good-event",
        title: "Padel Abend",
        startsAt: new Date("2026-03-01T15:00:00.000Z"),
        endsAt: new Date("2026-03-01T16:00:00.000Z"),
        sourceProvider: "google",
        sourceEventId: "source-cal:event-1",
      }),
      buildEvent({
        id: "own-event",
        title: "Eigenes Event",
        startsAt: new Date("2026-03-01T17:00:00.000Z"),
        endsAt: new Date("2026-03-01T18:00:00.000Z"),
        createdBy: "viewer",
      }),
      buildEvent({
        id: "managed-event",
        title: "[Realite] Schon verwaltet",
        startsAt: new Date("2026-03-01T19:00:00.000Z"),
        endsAt: new Date("2026-03-01T20:00:00.000Z"),
      }),
    ]);

    calendar.busyWindowsByUser.set("viewer", [
      {
        start: "2026-03-01T13:15:00.000Z",
        end: "2026-03-01T13:45:00.000Z",
      },
    ]);

    const suggestions = await service.generateSuggestions("viewer");

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.eventId).toBe("good-event");
    expect(suggestions[0]?.status).toBe("calendar_inserted");
    expect(suggestions[0]?.calendarEventId).toBe(`calendar:${suggestions[0]?.id}`);
    expect(calendar.insertedSuggestions).toHaveLength(1);
    expect(calendar.insertedSuggestions[0]?.blockedCalendarIds).toEqual(["source-cal"]);
    expect(calendar.removedSuggestionEvents).toEqual([
      {
        userId: "viewer",
        calendarEventRef: "calendar:stale",
        preferredCalendarId: "suggestions",
      },
    ]);
    expect(repository.listSuggestionsForUser("viewer").map((entry) => entry.eventId)).toEqual(["good-event"]);
  });
});
