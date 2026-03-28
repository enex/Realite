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
    allowOnSiteVisibility: overrides.allowOnSiteVisibility ?? false,
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

  test("degrades suggestions without calendar context instead of dropping them", async () => {
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
    repository.setVisibleEvents("viewer", [
      buildEvent({
        id: "calendarless-event",
        title: "Padel Abend",
        startsAt: new Date("2026-03-01T15:00:00.000Z"),
        endsAt: new Date("2026-03-01T16:00:00.000Z"),
      }),
    ]);
    calendar.busyWindowsByUser.set("viewer", null);

    const suggestions = await service.generateSuggestions("viewer");

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.eventId).toBe("calendarless-event");
    expect(suggestions[0]?.status).toBe("pending");
    expect(suggestions[0]?.calendarEventId).toBe(null);
    expect(suggestions[0]?.score).toBe(1.85);
    expect(suggestions[0]?.reason).toContain(
      "Verfügbarkeit gerade ohne Kalenderabgleich geschätzt.",
    );
    expect(suggestions[0]?.reason).toContain(
      "explizite Interessen aus deinem Matching",
    );
    expect(calendar.insertedSuggestions).toHaveLength(0);
  });

  test("prioritizes group context before generic public matches when calendar context is missing", async () => {
    const repository = new InMemoryRepository();
    const calendar = new InMemoryCalendarProvider();
    const service = createMatcherService({
      repository,
      calendar,
      now: () => new Date("2026-03-01T12:00:00.000Z"),
    });

    repository.setSuggestionSettings("viewer", {
      autoInsertSuggestions: false,
      suggestionCalendarId: "suggestions",
      suggestionLimitPerDay: 5,
      suggestionLimitPerWeek: 10,
    });
    repository.setVisibleEvents("viewer", [
      buildEvent({
        id: "group-event",
        title: "Padel im Freundeskreis",
        startsAt: new Date("2026-03-01T15:00:00.000Z"),
        endsAt: new Date("2026-03-01T16:00:00.000Z"),
        groupId: "group-1",
        groupName: "Padel",
        tags: ["#padel"],
      }),
      buildEvent({
        id: "public-event",
        title: "Offene Laufrunde",
        startsAt: new Date("2026-03-01T14:00:00.000Z"),
        endsAt: new Date("2026-03-01T15:00:00.000Z"),
        tags: ["#laufen"],
      }),
    ]);
    calendar.busyWindowsByUser.set("viewer", null);

    const suggestions = await service.generateSuggestions("viewer");

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.eventId).toBe("group-event");
    expect((suggestions[0]?.score ?? 0) > (suggestions[1]?.score ?? 0)).toBe(
      true,
    );
    expect(suggestions[0]?.score).toBe(1.55);
    expect(suggestions[1]?.score).toBe(1.25);
    expect(suggestions[0]?.reason).toContain("gemeinsamer Kreis");
    expect(suggestions[1]?.reason).toContain("Aktivität laufen");
  });
});
