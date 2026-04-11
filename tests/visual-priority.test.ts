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

    expect(meta.sectionClassName).toContain("bg-card");
    expect(meta.badgeClassName).toContain("muted");
  });

  test("falls back to neutral styling for unexpected priorities", () => {
    const meta = getVisualPriorityMeta("activity" as never);

    expect(meta.sectionClassName).toContain("border-border");
    expect(meta.badgeClassName).toContain("ring-border");
  });
});
