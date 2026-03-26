import { describe, expect, test } from "bun:test";

import {
  EVENT_CREATION_VISIBILITY_VALUES,
  getEventVisibilityMeta,
  getEventVisibilityRoadmapSummary,
  resolveEventVisibility,
} from "@/src/lib/event-visibility";

describe("event visibility", () => {
  test("exposes only selectable creation visibilities in the form/API", () => {
    expect(EVENT_CREATION_VISIBILITY_VALUES).toEqual([
      "public",
      "group",
      "friends",
      "friends_of_friends",
    ]);
  });

  test("maps kontakte events to friends visibility", () => {
    expect(
      resolveEventVisibility({
        requestedVisibility: "group",
        hasDateTag: false,
        isGlobalAlleEvent: false,
        targetsKontakteGroup: true,
      }),
    ).toBe("friends");
  });

  test("keeps date events on the protected dating visibility", () => {
    expect(
      resolveEventVisibility({
        requestedVisibility: "friends_of_friends",
        hasDateTag: true,
        isGlobalAlleEvent: false,
        targetsKontakteGroup: false,
      }),
    ).toBe("smart_date");
  });

  test("returns stable labels for friend-based visibilities", () => {
    expect(getEventVisibilityMeta("friends").label).toBe("Freunde");
    expect(getEventVisibilityMeta("friends_of_friends").label).toBe(
      "Freunde von Freunden",
    );
  });

  test("treats regular event visibilities as the v1.5 core model", () => {
    expect(getEventVisibilityMeta("group").stage).toBe("v1_5_core");
    expect(getEventVisibilityMeta("public").isCoreTier).toBe(true);
    expect(getEventVisibilityMeta("smart_date").stage).toBe("v2_extension");
  });

  test("documents the compact roadmap for visibility tiers", () => {
    expect(getEventVisibilityRoadmapSummary().description).toContain(
      "vier Freigaben",
    );
    expect(getEventVisibilityRoadmapSummary().description).toContain("#date");
  });
});
