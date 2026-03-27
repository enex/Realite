import { describe, expect, test } from "bun:test";

import {
  EVENT_PRESENCE_CHECK_IN_LEAD_MINUTES,
  getDefaultEventPresenceVisibleUntil,
  getEventPresenceAudienceCopy,
  getEventPresenceAudienceHint,
  getEventPresenceAudienceRuleCopy,
  getEventPresenceDisplayMeta,
  getEventPresenceDisplayState,
  getEventPresencePanelCopy,
  getEventPresenceStatusMeta,
  getEventPresenceToggleCopy,
  getEventPresenceWindow,
  getEventPresenceWindowOptions,
  getEventPresenceWindowCopy,
  isEventPresenceActive,
} from "@/src/lib/event-presence";

describe("event presence", () => {
  test("returns clear copy for an active on-site check-in", () => {
    expect(getEventPresenceStatusMeta("checked_in")).toEqual({
      label: "Vor Ort sichtbar",
      description:
        "Du bist für dieses Event aktuell bewusst und zeitlich begrenzt als vor Ort sichtbar markiert.",
    });
    expect(getEventPresenceToggleCopy(true).actionLabel).toBe(
      "Zeitfenster aktualisieren",
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

  test("distinguishes expired own visibility windows from manually hidden state", () => {
    const expiredState = getEventPresenceDisplayState({
      status: "checked_in",
      visibleUntil: new Date("2026-03-26T17:59:00.000Z"),
      now: new Date("2026-03-26T18:00:00.000Z"),
    });

    expect(expiredState).toBe("expired");
    expect(getEventPresenceDisplayMeta(expiredState)).toEqual({
      label: "Zeitfenster abgelaufen",
      description:
        "Dein gewähltes Vor-Ort-Zeitfenster ist vorbei. Du bist für dieses Event aktuell nicht mehr sichtbar.",
    });
    expect(getEventPresencePanelCopy(expiredState)).toEqual({
      title: "Dein Vor-Ort-Zeitfenster ist abgelaufen",
      description:
        "Du bist für dieses Event aktuell nicht mehr sichtbar. Solange das Eventfenster noch offen ist, kannst du direkt ein neues Zeitfenster starten.",
      actionLabel: "Neues Zeitfenster starten",
      successMessage: "Du bist für dieses Event jetzt wieder vor Ort sichtbar.",
    });
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

  test("offers bounded visibility options until the event ends", () => {
    const now = new Date("2026-03-26T18:00:00.000Z");
    const eventEndsAt = new Date("2026-03-26T19:15:00.000Z");

    expect(
      getEventPresenceWindowOptions(eventEndsAt, now).map((option) => option.label),
    ).toEqual(["30 Minuten", "60 Minuten", "Bis Eventende"]);
    expect(
      getDefaultEventPresenceVisibleUntil(eventEndsAt, now)?.toISOString(),
    ).toBe("2026-03-26T18:30:00.000Z");
  });

  test("explains why nobody is shown before the presence window or after the event", () => {
    expect(
      getEventPresenceAudienceCopy({
        windowState: "before_window",
        checkedInCount: 0,
      }),
    ).toEqual({
      title: "Vor-Ort-Sichtbarkeit startet später",
      description:
        "Vor dem Presence-Fenster ist noch niemand sichtbar. Realite zeigt erst kurz vor dem Event aktive Check-ins an.",
    });

    expect(
      getEventPresenceAudienceCopy({
        windowState: "ended",
        checkedInCount: 0,
      }),
    ).toEqual({
      title: "Vor-Ort-Sichtbarkeit ist beendet",
      description:
        "Mit dem Eventende verschwindet der Vor-Ort-Status automatisch. Danach bleibt niemand weiter sichtbar.",
    });
  });

  test("explains which event audience can see active check-ins", () => {
    expect(
      getEventPresenceAudienceRuleCopy({
        visibility: "friends",
      }),
    ).toEqual({
      title: "Wer sieht Vor-Ort-Status?",
      description:
        "Nur deine registrierten Kontakte sehen dieses Event. Nur diese Personen sehen in diesem Event aktive Vor-Ort-Check-ins.",
    });

    expect(
      getEventPresenceAudienceRuleCopy({
        visibility: "group",
        groupName: "WG Freitag",
      }),
    ).toEqual({
      title: "Wer sieht Vor-Ort-Status?",
      description:
        "Nur Mitglieder der Gruppe WG Freitag sehen in diesem Event-Kontext aktive Vor-Ort-Check-ins.",
    });

    expect(
      getEventPresenceAudienceRuleCopy({
        visibility: "smart_date",
      }),
    ).toEqual({
      title: "Wer sieht Vor-Ort-Status?",
      description:
        "Nur passende gegenseitige Matches sehen dieses Event im Dating-Kontext. Nur diese Personen sehen in diesem Event aktive Vor-Ort-Check-ins.",
    });
  });

  test("returns a compact audience hint for event cards and detail summaries", () => {
    expect(
      getEventPresenceAudienceHint({
        visibility: "group",
        groupName: "WG Freitag",
      }),
    ).toBe("Aktive Check-ins sehen nur Mitglieder von WG Freitag.");

    expect(
      getEventPresenceAudienceHint({
        visibility: "friends_of_friends",
      }),
    ).toBe("Aktive Check-ins sehen nur deine Kontakte und deren Kontakte.");

    expect(
      getEventPresenceAudienceHint({
        visibility: "public",
      }),
    ).toBe("Aktive Check-ins sehen nur Personen, die dieses Event sehen duerfen.");
  });

  test("treats expired presence windows as inactive", () => {
    const now = new Date("2026-03-26T18:00:00.000Z");

    expect(
      isEventPresenceActive(
        "checked_in",
        new Date("2026-03-26T18:30:00.000Z"),
        now,
      ),
    ).toBe(true);
    expect(
      isEventPresenceActive(
        "checked_in",
        new Date("2026-03-26T17:59:00.000Z"),
        now,
      ),
    ).toBe(false);
  });
});
