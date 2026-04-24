import { describe, expect, test } from "bun:test";

import { toDashboardIsoString } from "@/src/lib/dashboard-data";

describe("dashboard data serialization", () => {
  test("serializes Date values and database timestamp strings to ISO strings", () => {
    expect(toDashboardIsoString(new Date("2026-04-24T21:30:00.000Z"))).toBe(
      "2026-04-24T21:30:00.000Z",
    );
    expect(toDashboardIsoString("2026-04-24T21:30:00.000Z")).toBe(
      "2026-04-24T21:30:00.000Z",
    );
  });
});
