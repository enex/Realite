import { describe, expect, test } from "bun:test";

import { buildEventPresenceSummary } from "@/src/lib/repository";

describe("event presence summary", () => {
  test("keeps an expired own check-in so the UI can show the protection state", () => {
    const summary = buildEventPresenceSummary({
      rows: [
        {
          userId: "user-1",
          status: "checked_in",
          updatedAt: new Date("2026-03-27T18:00:00.000Z"),
          visibleUntil: new Date("2026-03-27T18:15:00.000Z"),
          name: "A",
          email: "a@example.com",
          presenceLocationNote: null,
        },
      ],
      userId: "user-1",
      startsAt: new Date("2026-03-27T19:00:00.000Z"),
      endsAt: new Date("2026-03-27T22:00:00.000Z"),
      now: new Date("2026-03-27T18:30:00.000Z"),
    });

    expect(summary.currentUserStatus).toBe("checked_in");
    expect(summary.currentUserVisibleUntil?.toISOString()).toBe(
      "2026-03-27T18:15:00.000Z",
    );
    expect(summary.checkedInUsers).toHaveLength(0);
  });

  test("keeps active users visible while excluding expired ones from the audience list", () => {
    const summary = buildEventPresenceSummary({
      rows: [
        {
          userId: "user-1",
          status: "checked_in",
          updatedAt: new Date("2026-03-27T18:00:00.000Z"),
          visibleUntil: new Date("2026-03-27T19:00:00.000Z"),
          name: "A",
          email: "a@example.com",
          presenceLocationNote: null,
        },
        {
          userId: "user-2",
          status: "checked_in",
          updatedAt: new Date("2026-03-27T18:05:00.000Z"),
          visibleUntil: new Date("2026-03-27T18:10:00.000Z"),
          name: "B",
          email: "b@example.com",
          presenceLocationNote: "Vor der Bühne",
        },
      ],
      userId: "user-1",
      startsAt: new Date("2026-03-27T19:00:00.000Z"),
      endsAt: new Date("2026-03-27T22:00:00.000Z"),
      now: new Date("2026-03-27T18:30:00.000Z"),
    });

    expect(summary.currentUserStatus).toBe("checked_in");
    expect(summary.checkedInUsers.map((entry) => entry.userId)).toEqual(["user-1"]);
  });
});
