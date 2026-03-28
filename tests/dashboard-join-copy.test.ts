import { describe, expect, test } from "bun:test";

import { getDashboardJoinFirstCopy } from "@/src/lib/dashboard-join-copy";

describe("dashboard join-first copy", () => {
  test("calls out circle context when the only visible activity comes from a group", () => {
    expect(
      getDashboardJoinFirstCopy({
        groupName: "Laufrunde",
        visibility: "group",
      }),
    ).toEqual({
      questionValue: "1 Aktivität aus Laufrunde",
      questionDescription:
        "Gerade ist vor allem eine sichtbare Aktivität aus deinem Kreis offen. Du könntest dort die erste klare Zusage im passenden Kontext setzen.",
      nextStepTitle: "Erste Zusage im Kreis setzen",
      nextStepDescription:
        "Gerade gibt es eine sichtbare Aktivität aus Laufrunde ohne Zusagen. Wenn sie passt, kannst du dort den ersten klaren Mitmach-Schritt im bestehenden Kreis setzen.",
      eventsReturnDescription:
        "Dort prüfst du die nächste sichtbare Aktivität aus Laufrunde, bei der du ohne viel Abstimmung direkt einsteigen kannst.",
    });
  });

  test("keeps openly visible activities distinct from group-scoped ones", () => {
    expect(
      getDashboardJoinFirstCopy({
        groupName: null,
        visibility: "public",
      }),
    ).toEqual({
      questionValue: "1 offene Aktivität für schnellen Einstieg",
      questionDescription:
        "Gerade ist eine offen sichtbare Aktivität ohne Zusagen da. Wenn sie passt, kannst du hier den ersten öffentlichen Einstieg setzen.",
      nextStepTitle: "Erste offene Aktivität prüfen",
      nextStepDescription:
        "Gerade gibt es eine offen sichtbare Aktivität ohne Zusagen. Wenn sie passt, kannst du dort den ersten klaren Mitmach-Schritt setzen.",
      eventsReturnDescription:
        "Dort prüfst du zuerst die nächste offen sichtbare Aktivität, bei der du ohne viel Abstimmung direkt einsteigen kannst.",
    });
  });
});
