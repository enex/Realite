import { describe, expect, test } from "bun:test";

import { formatEventShareOwner } from "@/src/lib/event-share";

describe("event share privacy", () => {
  test("uses the creator name when present", () => {
    expect(
      formatEventShareOwner({
        id: "event-1",
        title: "Abendessen",
        description: null,
        location: null,
        startsAt: new Date("2026-03-27T18:00:00.000Z"),
        endsAt: new Date("2026-03-27T20:00:00.000Z"),
        joinMode: "direct",
        createdByName: "Mara",
        createdByEmail: "mara@example.com",
        color: null,
        placeImageUrl: null,
        linkPreviewImageUrl: null,
      }),
    ).toBe("Von Mara");
  });

  test("does not expose creator email in public share copy", () => {
    expect(
      formatEventShareOwner({
        id: "event-1",
        title: "Abendessen",
        description: null,
        location: null,
        startsAt: new Date("2026-03-27T18:00:00.000Z"),
        endsAt: new Date("2026-03-27T20:00:00.000Z"),
        joinMode: "direct",
        createdByName: null,
        createdByEmail: "mara@example.com",
        color: null,
        placeImageUrl: null,
        linkPreviewImageUrl: null,
      }),
    ).toBe("Von einem Realite Mitglied");
  });
});
