import { describe, expect, test } from "bun:test";

import { getEventJoinModeMeta } from "@/src/lib/event-join-modes";

describe("event join modes", () => {
  test("provides stable labels for all join modes", () => {
    expect(getEventJoinModeMeta("direct").label).toBe("Direkt beitreten");
    expect(getEventJoinModeMeta("request").shortLabel).toBe("Anfrage nötig");
    expect(getEventJoinModeMeta("interest").description).toContain("unverbindlich");
  });
});
