import { describe, expect, test } from "bun:test";

import { getVisualPriorityMeta } from "@/src/lib/visual-priority";

describe("visual priority", () => {
  test("maps reaction surfaces to amber emphasis", () => {
    const meta = getVisualPriorityMeta("reaction");

    expect(meta.sectionClassName).toContain("amber");
    expect(meta.badgeClassName).toContain("amber");
  });

  test("maps momentum surfaces to teal emphasis", () => {
    const meta = getVisualPriorityMeta("momentum");

    expect(meta.sectionClassName).toContain("teal");
    expect(meta.actionRowClassName).toContain("teal");
  });

  test("keeps planning surfaces neutral and management-focused", () => {
    const meta = getVisualPriorityMeta("planning");

    expect(meta.sectionClassName).toContain("white");
    expect(meta.badgeClassName).toContain("slate");
  });
});
