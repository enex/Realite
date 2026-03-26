import { describe, expect, test } from "bun:test";

import { getCardSurfaceMeta } from "@/src/lib/card-system";

describe("card system", () => {
  test("maps suggestions to reaction surfaces", () => {
    const meta = getCardSurfaceMeta("suggestion");

    expect(meta.priority).toBe("reaction");
    expect(meta.sectionClassName).toContain("rounded-2xl");
    expect(meta.itemClassName).toContain("rounded-xl");
    expect(meta.badgeClassName).toContain("amber");
  });

  test("keeps smart meetings in planning surfaces", () => {
    const meta = getCardSurfaceMeta("smart_meeting");

    expect(meta.priority).toBe("planning");
    expect(meta.actionClassName).toContain("border-slate-300");
    expect(meta.badgeClassName).toContain("slate");
  });
});
