import { describe, expect, test } from "bun:test";

import {
  APP_SHELL_SECTIONS,
  getCurrentAppShellSection,
  isAppShellSectionActive,
} from "@/src/lib/app-shell-navigation";

describe("app shell navigation", () => {
  test("keeps the core sections in product order", () => {
    expect(APP_SHELL_SECTIONS.map((section) => section.label)).toEqual([
      "Jetzt",
      "Vorschläge",
      "Events",
      "Gruppen",
    ]);
  });

  test("marks nested routes under a section as active", () => {
    expect(isAppShellSectionActive("/groups/abc", "/groups")).toBe(true);
    expect(isAppShellSectionActive("/events", "/groups")).toBe(false);
  });

  test("maps settings into the management layer", () => {
    expect(getCurrentAppShellSection("/settings")?.label).toBe("Profil");
    expect(getCurrentAppShellSection("/settings")?.intent).toBe("Verwalten");
  });
});
