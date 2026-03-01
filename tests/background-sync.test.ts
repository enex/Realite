import { describe, expect, test } from "bun:test";

import { createDashboardBackgroundSyncService } from "@/src/lib/background-sync";
import { InMemoryCalendarProvider } from "@/src/lib/in-memory-platform";

describe("dashboard background sync", () => {
  test("throttles repeated runs with injected time", async () => {
    const calendar = new InMemoryCalendarProvider();
    calendar.syncPublicEventsResultByUser.set("user-1", {
      synced: 3,
      scanned: 7,
    });

    let nowMs = Date.parse("2026-03-01T10:00:00.000Z");
    let contactCalls = 0;
    let smartCalls = 0;

    const service = createDashboardBackgroundSyncService({
      calendar,
      syncContacts: async () => {
        contactCalls += 1;
        return { syncedGroups: 1, syncedMembers: 2, scannedContacts: 3 };
      },
      syncSmartMeetings: async () => {
        smartCalls += 1;
        return {
          checked: 1,
          secured: 0,
          expired: 0,
          rescheduled: 0,
          exhausted: 0,
        };
      },
      now: () => new Date(nowMs),
    });

    service.triggerDashboardBackgroundSync("user-1");
    await service.waitForIdle("user-1");

    service.triggerDashboardBackgroundSync("user-1");
    await service.waitForIdle("user-1");

    nowMs += 90_000;
    service.triggerDashboardBackgroundSync("user-1");
    await service.waitForIdle("user-1");

    expect(calendar.syncPublicEventsCalls).toEqual(["user-1", "user-1"]);
    expect(contactCalls).toBe(2);
    expect(smartCalls).toBe(2);

    const snapshot = service.getDashboardSyncSnapshot("user-1");
    expect(snapshot.lastTriggeredAt).toBe("2026-03-01T10:01:30.000Z");
    expect(snapshot.lastCompletedAt).toBe("2026-03-01T10:01:30.000Z");
    expect(snapshot.stats).toEqual({ synced: 3, scanned: 7 });
  });

  test("does not start a second run while one is already in flight", async () => {
    const calendar = new InMemoryCalendarProvider();
    let resolveContacts = () => {};
    let contactCalls = 0;

    const service = createDashboardBackgroundSyncService({
      calendar,
      syncContacts: () =>
        new Promise((resolve) => {
          contactCalls += 1;
          resolveContacts = () =>
            resolve({
              syncedGroups: 0,
              syncedMembers: 0,
              scannedContacts: 0,
            });
        }),
      syncSmartMeetings: async () => ({
        checked: 0,
        secured: 0,
        expired: 0,
        rescheduled: 0,
        exhausted: 0,
      }),
      now: () => new Date("2026-03-01T10:00:00.000Z"),
    });

    service.triggerDashboardBackgroundSync("user-2");
    service.triggerDashboardBackgroundSync("user-2");
    await Promise.resolve();

    expect(service.getDashboardSyncSnapshot("user-2").revalidating).toBe(true);
    expect(contactCalls).toBe(1);

    resolveContacts();
    await service.waitForIdle("user-2");

    expect(service.getDashboardSyncSnapshot("user-2").revalidating).toBe(false);
  });
});
