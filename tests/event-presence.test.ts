import { describe, expect, test } from "bun:test";

import {
  EVENT_PRESENCE_CHECK_IN_LEAD_MINUTES,
  getEventPresenceStatusMeta,
  getEventPresenceToggleCopy,
  getEventPresenceWindow,
  getEventPresenceWindowCopy,
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

  test("opens on-site visibility shortly before the event and closes it after the event", () => {
    const startsAt = new Date("2026-03-26T20:00:00.000Z");
    const endsAt = new Date("2026-03-26T22:00:00.000Z");
    const beforeWindow = getEventPresenceWindow({
      startsAt,
      endsAt,
      now: new Date("2026-03-26T18:00:00.000Z"),
    });
    const activeWindow = getEventPresenceWindow({
      startsAt,
      endsAt,
      now: new Date("2026-03-26T19:30:00.000Z"),
    });
    const endedWindow = getEventPresenceWindow({
      startsAt,
      endsAt,
      now: new Date("2026-03-26T22:01:00.000Z"),
    });

    expect(beforeWindow.state).toBe("before_window");
    expect(beforeWindow.canCheckIn).toBe(false);
    expect(beforeWindow.showsPresence).toBe(false);
    expect(beforeWindow.opensAt).toEqual(
      new Date(startsAt.getTime() - EVENT_PRESENCE_CHECK_IN_LEAD_MINUTES * 60_000),
    );

    expect(activeWindow.state).toBe("active");
    expect(activeWindow.canCheckIn).toBe(true);
    expect(activeWindow.showsPresence).toBe(true);

    expect(endedWindow.state).toBe("ended");
    expect(endedWindow.canCheckIn).toBe(false);
    expect(endedWindow.showsPresence).toBe(false);
  });

  test("explains the active presence window in user-facing copy", () => {
    const copy = getEventPresenceWindowCopy({
      startsAt: new Date("2026-03-26T20:00:00.000Z"),
      endsAt: new Date("2026-03-26T22:00:00.000Z"),
      now: new Date("2026-03-26T18:00:00.000Z"),
    });

    expect(copy.label).toBe("Vor-Ort-Sichtbarkeit startet später");
    expect(copy.description).toContain("kurz vor dem Event");
    expect(copy.actionLabel).toContain("vor Ort sichtbar");
  });
});
