import { describe, expect, test } from "bun:test";

import {
  filterDashboardFeedEvents,
  rankDashboardFeedEvents,
  type DashboardFeedEvent,
} from "@/src/lib/dashboard-feed";

function createEvent(overrides: Partial<DashboardFeedEvent>): DashboardFeedEvent {
  return {
    id: overrides.id ?? "event-1",
    startsAt: overrides.startsAt ?? "2026-03-27T18:00:00.000Z",
    createdBy: overrides.createdBy ?? "other-user",
    acceptedCount: overrides.acceptedCount ?? 0,
    isAccepted: overrides.isAccepted ?? false,
    isOwnEvent: overrides.isOwnEvent ?? false,
  };
}

describe("dashboard feed", () => {
  test("prioritizes momentum and joinable activities before involvement and hosting", () => {
    const ranked = rankDashboardFeedEvents([
      createEvent({ id: "hosting", isOwnEvent: true, createdBy: "me", acceptedCount: 2, startsAt: "2026-03-27T16:00:00.000Z" }),
      createEvent({ id: "accepted", isAccepted: true, acceptedCount: 3, startsAt: "2026-03-27T15:00:00.000Z" }),
      createEvent({ id: "join-first", acceptedCount: 0, startsAt: "2026-03-27T13:00:00.000Z" }),
      createEvent({ id: "momentum", acceptedCount: 4, startsAt: "2026-03-27T14:00:00.000Z" }),
    ]);

    expect(ranked.map((event) => event.id)).toEqual(["momentum", "join-first", "accepted", "hosting"]);
  });

  test("keeps same-priority events sorted by start time", () => {
    const ranked = rankDashboardFeedEvents([
      createEvent({ id: "later", acceptedCount: 2, startsAt: "2026-03-27T17:00:00.000Z" }),
      createEvent({ id: "earlier", acceptedCount: 1, startsAt: "2026-03-27T12:00:00.000Z" }),
    ]);

    expect(ranked.map((event) => event.id)).toEqual(["earlier", "later"]);
  });

  test("filters to the requested focus without changing the input order", () => {
    const events = [
      createEvent({ id: "momentum", acceptedCount: 2 }),
      createEvent({ id: "accepted", isAccepted: true, acceptedCount: 2 }),
      createEvent({ id: "hosting", isOwnEvent: true, createdBy: "me", acceptedCount: 1 }),
      createEvent({ id: "joinable" }),
    ];

    expect(filterDashboardFeedEvents(events, "momentum").map((event) => event.id)).toEqual([
      "momentum",
      "accepted",
      "hosting",
    ]);
    expect(filterDashboardFeedEvents(events, "involved").map((event) => event.id)).toEqual([
      "accepted",
      "hosting",
    ]);
    expect(filterDashboardFeedEvents(events, "prioritized").map((event) => event.id)).toEqual([
      "momentum",
      "accepted",
      "hosting",
      "joinable",
    ]);
  });
});
