import { describe, expect, test } from "bun:test";

import {
  buildRealiteCalendarMetadata,
  stripRealiteCalendarMetadata
} from "@/src/lib/realite-calendar-links";

describe("realite calendar metadata", () => {
  test("removes legacy suggestion block", () => {
    const description = [
      "Treffpunkt am See",
      "",
      "Vorschlag von Realite.",
      "Eventseite: https://realite.app/e/abc123",
      "Antwortseite: https://realite.app/s/def456"
    ].join("\n");

    expect(stripRealiteCalendarMetadata(description)).toBe("Treffpunkt am See");
  });

  test("builds a single metadata block and replaces existing one", () => {
    const withOldBlock = [
      "Bitte pünktlich sein.",
      "",
      "Realite-Link (automatisch ergänzt)",
      "Typ: Vorschlag",
      "URL: https://realite.app/s/old123"
    ].join("\n");

    const next = buildRealiteCalendarMetadata({
      description: withOldBlock,
      type: "event",
      url: "https://realite.app/e/new456"
    });

    expect(next).toContain("Bitte pünktlich sein.");
    expect(next).toContain("Realite-Link (automatisch ergänzt): https://realite.app/e/new456");
    expect(next).toContain("https://realite.app/e/new456");
    expect(next).not.toContain("old123");
    expect(next).not.toContain("Typ:");
  });

  test("returns null when description only contains metadata", () => {
    const metadataOnly = "Realite-Link (automatisch ergänzt): https://realite.app/e/abc123";

    expect(stripRealiteCalendarMetadata(metadataOnly)).toBe(null);
  });
});
