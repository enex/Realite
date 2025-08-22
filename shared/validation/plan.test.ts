import { expect, test } from "bun:test";
import { listOccurrences, repetitionSchema } from "./plan";

test("repetitionSchema", () => {
  repetitionSchema.parse({
    frequency: "WEEKLY",
    interval: 1,
    byWeekday: ["MO", "FR"],
    timeWindows: [{ start: "18:00", end: "20:00" }],
    startDate: "2024-06-01",
  });
});

test("generateOccurrences handles overnight window (20:00-04:00)", () => {
  const occurrences = listOccurrences(
    {
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: ["FR"],
      timeWindows: [{ start: "20:00", end: "04:00" }],
      startDate: "2024-09-01",
      endDate: "2024-09-30",
      exDates: [],
    },
    { from: "2024-09-01", to: "2024-09-30" }
  );

  // Fridays in Sept 2024: 6, 13, 20, 27
  expect(occurrences.length).toBeGreaterThanOrEqual(4);
  const first = occurrences[0]!;
  // Start on 2024-09-06T20:00:00.000Z, end on next day 04:00Z
  expect(first.start.startsWith("2024-09-06T20:00:00.000Z")).toBeTrue();
  expect(first.end.startsWith("2024-09-07T04:00:00.000Z")).toBeTrue();
});

test("generateOccurrences respects exDates", () => {
  const occurrences = listOccurrences(
    {
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: ["FR"],
      timeWindows: [{ start: "20:00", end: "04:00" }],
      startDate: "2024-09-01",
      endDate: "2024-09-30",
      exDates: ["2024-09-13"],
    },
    { from: "2024-09-01", to: "2024-09-30" }
  );

  const dates = occurrences.map((o) => o.date);
  expect(dates).toContain("2024-09-06");
  expect(dates).not.toContain("2024-09-13");
  expect(dates).toContain("2024-09-20");
});

test("range filtering includes only from/to window (inclusive)", () => {
  const occurrences = listOccurrences(
    {
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: ["FR"],
      timeWindows: [{ start: "20:00", end: "04:00" }],
      startDate: "2024-09-01",
      endDate: "2024-09-30",
      exDates: [],
    },
    { from: "2024-09-05", to: "2024-09-06" }
  );

  const dates = occurrences.map((o) => o.date);
  expect(dates).toEqual(["2024-09-06"]);
});

test("weekly interval=2 only every second eligible week", () => {
  const occurrences = listOccurrences(
    {
      frequency: "WEEKLY",
      interval: 2,
      byWeekday: ["FR"],
      timeWindows: [{ start: "18:00", end: "20:00" }],
      startDate: "2024-09-01",
      endDate: "2024-09-30",
      exDates: [],
    },
    { from: "2024-09-01", to: "2024-09-30" }
  );

  // Expect roughly two Fridays within the month due to interval=2
  const dates = occurrences.map((o) => o.date);
  // First eligible Friday from startDate anchor is 2024-09-06, next at +2 weeks: 2024-09-20
  expect(dates).toContain("2024-09-06");
  expect(dates).toContain("2024-09-20");
  // Should not include 13 or 27
  expect(dates).not.toContain("2024-09-13");
  expect(dates).not.toContain("2024-09-27");
});
