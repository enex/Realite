import { describe, expect, test } from "bun:test";

import { getWeeklyShareWeekStart } from "@/src/lib/repository";

describe("weekly share", () => {
  test("uses Monday UTC as weekly campaign boundary", () => {
    expect(getWeeklyShareWeekStart(new Date("2026-04-24T12:00:00Z")).toISOString()).toBe(
      "2026-04-20T00:00:00.000Z",
    );
    expect(getWeeklyShareWeekStart(new Date("2026-04-26T23:59:00Z")).toISOString()).toBe(
      "2026-04-20T00:00:00.000Z",
    );
    expect(getWeeklyShareWeekStart(new Date("2026-04-27T00:00:00Z")).toISOString()).toBe(
      "2026-04-27T00:00:00.000Z",
    );
  });
});
