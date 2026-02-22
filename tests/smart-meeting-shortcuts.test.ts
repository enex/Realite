import { describe, expect, test } from "bun:test";

import { parseSmartMeetingShortcuts } from "@/src/lib/smart-meeting-shortcuts";

describe("smart meeting shortcuts", () => {
  test("extracts known shortcuts and removes them from title", () => {
    const parsed = parseSmartMeetingShortcuts("Team Sync !min=4 !frist=24h !fenster=36h !versuche=2 !interval=30m");

    expect(parsed.enabled).toBe(true);
    expect(parsed.cleanedTitle).toBe("Team Sync");
    expect(parsed.minAcceptedParticipants).toBe(4);
    expect(parsed.responseWindowHours).toBe(24);
    expect(parsed.searchWindowHours).toBe(36);
    expect(parsed.maxAttempts).toBe(2);
    expect(parsed.slotIntervalMinutes).toBe(30);
  });

  test("accepts compact formats", () => {
    const parsed = parseSmartMeetingShortcuts("Padel !min3");

    expect(parsed.enabled).toBe(true);
    expect(parsed.cleanedTitle).toBe("Padel");
    expect(parsed.minAcceptedParticipants).toBe(3);
  });

  test("keeps title unchanged when no shortcut exists", () => {
    const parsed = parseSmartMeetingShortcuts("Normales Meeting");

    expect(parsed.enabled).toBe(false);
    expect(parsed.cleanedTitle).toBe("Normales Meeting");
    expect(parsed.minAcceptedParticipants).toBe(null);
  });
});
