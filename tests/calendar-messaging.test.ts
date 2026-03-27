import { describe, expect, test } from "bun:test";

import { getEventsViewMessaging, getSuggestionSettingsMessaging } from "@/src/lib/calendar-messaging";

describe("calendar messaging", () => {
  test("keeps events understandable without calendar access", () => {
    const messaging = getEventsViewMessaging(false);

    expect(messaging.sectionTitle).toBe("Events für Planung und Zusagen");
    expect(messaging.heroLead).toContain("auch ohne verbundenen Kalender");
    expect(messaging.emptyDescription).toContain("direkt selbst starten");
  });

  test("frames calendar connection as optional support in settings", () => {
    const messaging = getSuggestionSettingsMessaging(false);

    expect(messaging.supportTitle).toBe("Ohne Kalender weiter nutzbar");
    expect(messaging.warning).toContain("kein Kalenderzugriff aktiv");
    expect(messaging.disabledHint).toContain("später einen Kalender verbindest");
  });

  test("describes added calendar support when connected", () => {
    const messaging = getSuggestionSettingsMessaging(true);

    expect(messaging.supportTitle).toBe("Kalenderzugriff aktiv");
    expect(messaging.warning).toBe(null);
    expect(messaging.autoInsertDescription).toContain("deinem Kalender vorgemerkt");
  });
});
