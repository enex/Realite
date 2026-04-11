import { describe, expect, test } from "bun:test";

import {
  detailBodyClassName,
  getPageIntentMeta,
  pageLeadClassName,
  pageShellClassName,
  pageTitleClassName,
  sectionBodyClassName,
  sectionTitleClassName,
} from "@/src/lib/page-hierarchy";

describe("page hierarchy", () => {
  test("keeps header shells and text rhythm consistent", () => {
    expect(pageShellClassName).toContain("rounded-2xl");
    expect(pageShellClassName).toContain("p-6");
    expect(pageTitleClassName).toContain("text-2xl");
    expect(pageLeadClassName).toContain("leading-6");
    expect(sectionTitleClassName).toContain("text-lg");
    expect(sectionBodyClassName).toContain("leading-6");
    expect(detailBodyClassName).toContain("leading-6");
  });

  test("maps page intents to stable eyebrow tones", () => {
    expect(getPageIntentMeta("discover").eyebrowClassName).toContain("teal");
    expect(getPageIntentMeta("react").eyebrowClassName).toContain("amber");
    expect(getPageIntentMeta("manage").eyebrowClassName).toContain("muted-foreground");
  });
});
