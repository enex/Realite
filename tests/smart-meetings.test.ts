import { describe, expect, test } from "bun:test";

import {
  planBestSmartMeetingSlot,
  type SmartMeetingMemberStatsRecord,
  type SmartMeetingParticipant,
} from "@/src/lib/smart-meetings";

function createParticipant(
  email: string,
  registeredUserId: string,
): SmartMeetingParticipant {
  return {
    email,
    label: email,
    registeredUserId,
  };
}

describe("smart meeting scheduling", () => {
  test("prefers the slot with the highest predicted attendance", () => {
    const participants = [
      createParticipant("alice@example.com", "alice"),
      createParticipant("bob@example.com", "bob"),
    ];

    const preferenceMapByUser = new Map<string, Map<string, number>>([
      ["alice", new Map([["#padel", 2], ["timeslot:1:12", 2]])],
      ["bob", new Map([["#padel", 1]])],
    ]);
    const statsByEmail = new Map<string, SmartMeetingMemberStatsRecord | null>([
      [
        "alice@example.com",
        { acceptCount: 5, declineCount: 0, noResponseCount: 0 },
      ],
      [
        "bob@example.com",
        { acceptCount: 3, declineCount: 0, noResponseCount: 1 },
      ],
    ]);
    const busyWindowsByEmail = new Map([
      [
        "alice@example.com",
        [
          {
            start: new Date("2026-03-02T10:30:00.000Z"),
            end: new Date("2026-03-02T11:30:00.000Z"),
          },
        ],
      ],
      ["bob@example.com", []],
    ]);

    const best = planBestSmartMeetingSlot({
      plan: {
        createdBy: "owner-1",
        tags: "#padel",
        durationMinutes: 60,
        slotIntervalMinutes: 30,
        searchWindowStart: new Date("2026-03-02T10:00:00.000Z"),
        searchWindowEnd: new Date("2026-03-02T13:00:00.000Z"),
      },
      participants,
      excludedStartTimes: new Set([
        new Date("2026-03-02T10:00:00.000Z").getTime(),
      ]),
      preferenceMapByUser,
      statsByEmail,
      busyWindowsByEmail,
      now: new Date("2026-03-02T09:55:00.000Z"),
    });

    expect(best?.startsAt.toISOString()).toBe("2026-03-02T12:00:00.000Z");
    expect(best?.endsAt.toISOString()).toBe("2026-03-02T13:00:00.000Z");
    expect(Number(best?.expectedAccepted.toFixed(2))).toBe(
      best?.expectedAccepted,
    );
  });

  test("breaks equal scores by the earlier slot", () => {
    const best = planBestSmartMeetingSlot({
      plan: {
        createdBy: "owner-2",
        tags: "#coffee",
        durationMinutes: 60,
        slotIntervalMinutes: 30,
        searchWindowStart: new Date("2026-03-04T10:00:00.000Z"),
        searchWindowEnd: new Date("2026-03-04T12:00:00.000Z"),
      },
      participants: [createParticipant("eve@example.com", "eve")],
      excludedStartTimes: new Set<number>(),
      preferenceMapByUser: new Map(),
      statsByEmail: new Map(),
      busyWindowsByEmail: new Map([["eve@example.com", []]]),
      now: new Date("2026-03-04T09:55:00.000Z"),
    });

    expect(best?.startsAt.toISOString()).toBe("2026-03-04T10:00:00.000Z");
  });
});
