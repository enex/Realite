import { describe, expect, test } from "bun:test";

import { getEventOnSiteVisibilityMeta } from "@/src/lib/event-on-site";

describe("event on-site visibility", () => {
  test("returns opt-in copy when on-site visibility is enabled", () => {
    expect(getEventOnSiteVisibilityMeta(true)).toEqual({
      label: "Vor Ort sichtbar möglich",
      shortLabel: "Vor Ort sichtbar",
      description:
        "Für dieses Event ist freiwillige Vor-Ort-Sichtbarkeit erlaubt. Nichts wird automatisch geteilt.",
    });
  });

  test("returns protective copy when on-site visibility is disabled", () => {
    expect(getEventOnSiteVisibilityMeta(false)).toEqual({
      label: "Vor Ort sichtbar aus",
      shortLabel: "Vor Ort aus",
      description:
        "Für dieses Event bleibt Vor-Ort-Sichtbarkeit deaktiviert, bis du sie bewusst erlaubst.",
    });
  });
});
