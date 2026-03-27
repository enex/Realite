import { describe, expect, test } from "bun:test";

import {
  getGroupManagementFocus,
  getGroupManagementState,
  sortGroupsForManagement
} from "@/src/lib/group-management";

describe("group management", () => {
  test("classifies groups by management state", () => {
    expect(getGroupManagementState({ eventCount: 2, contactCount: 1 }).label).toBe("Aktiv genutzt");
    expect(getGroupManagementState({ eventCount: 0, contactCount: 3 }).label).toBe("Kreis steht");
    expect(getGroupManagementState({ eventCount: 0, contactCount: 0 }).label).toBe("Wartet auf Pflege");
  });

  test("sorts active groups before setup work", () => {
    const sorted = sortGroupsForManagement([
      {
        id: "c",
        name: "Leer",
        eventCount: 0,
        contactCount: 0,
        syncProvider: null,
        syncEnabled: false,
        visibility: "private" as const
      },
      {
        id: "b",
        name: "Kontakte",
        eventCount: 0,
        contactCount: 6,
        syncProvider: null,
        syncEnabled: false,
        visibility: "private" as const
      },
      {
        id: "a",
        name: "Aktiv",
        eventCount: 3,
        contactCount: 2,
        syncProvider: "google_contacts",
        syncEnabled: true,
        visibility: "public" as const
      }
    ]);

    expect(sorted.map((group) => group.name)).toEqual(["Aktiv", "Kontakte", "Leer"]);
  });

  test("surfaces hidden sync groups when nothing visible is maintained", () => {
    const focus = getGroupManagementFocus([], 2);

    expect(focus.title).toContain("Sync");
  });
});
