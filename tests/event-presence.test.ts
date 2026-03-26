import { describe, expect, test } from "bun:test";

import {
  getEventPresenceStatusMeta,
  getEventPresenceToggleCopy,
} from "@/src/lib/event-presence";

describe("event presence", () => {
  test("returns clear copy for an active on-site check-in", () => {
    expect(getEventPresenceStatusMeta("checked_in")).toEqual({
      label: "Vor Ort sichtbar",
      description:
        "Du bist für dieses Event aktuell bewusst als vor Ort sichtbar markiert.",
    });
    expect(getEventPresenceToggleCopy(true).actionLabel).toBe(
      "Nicht mehr vor Ort sichtbar",
    );
  });

  test("returns protective copy for a hidden on-site state", () => {
    expect(getEventPresenceStatusMeta("left")).toEqual({
      label: "Nicht vor Ort sichtbar",
      description:
        "Du bist für dieses Event aktuell nicht als vor Ort sichtbar markiert.",
    });
    expect(getEventPresenceToggleCopy(false).actionLabel).toBe(
      "Jetzt vor Ort sichtbar sein",
    );
  });
});
