import { z } from "zod";
import { ActivityId } from "../activities";

/**
 * Repetition/Availability schema for recurring time slots, mappable to iCal RRULE/EXDATE/DTSTART.
 * Example: Every Monday and Friday, 18:00-20:00
 */

export const weekdaySchema = z.enum([
  "MO", // Monday
  "TU", // Tuesday
  "WE", // Wednesday
  "TH", // Thursday
  "FR", // Friday
  "SA", // Saturday
  "SU", // Sunday
]);
export type Weekday = z.infer<typeof weekdaySchema>;

/**
 * Time in "HH:mm" 24h format (e.g. "18:00")
 */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)");

/**
 * A single time window on a day (e.g. 18:00-20:00)
 */
export const timeWindowSchema = z.object({
  start: timeStringSchema,
  end: timeStringSchema,
});
export type TimeWindow = z.infer<typeof timeWindowSchema>;

/** repetition schema without startDate and endDate because they are stored seperately */
export const coreRepetitionSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  interval: z.number().int().min(1).default(1), // every n weeks
  byWeekday: z.array(weekdaySchema).min(1), // e.g. ["MO", "FR"]
  timeWindows: z.array(timeWindowSchema).min(1), // e.g. [{start: "18:00", end: "20:00"}]
  exDates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"))
    .optional()
    .describe("excluded dates"),
});

export type CoreRepetition = z.infer<typeof coreRepetitionSchema>;

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

/**
 * Repetition rule, mappable to iCal RRULE
 */
export const repetitionSchema = coreRepetitionSchema.extend({
  startDate: isoDateSchema, // e.g. "2024-06-01"
  endDate: isoDateSchema.optional(), // optional end date
});
export type Repetition = z.infer<typeof repetitionSchema>;

/**
 * Example usage:
 * {
 *   frequency: "WEEKLY",
 *   interval: 1,
 *   byWeekday: ["MO", "FR"],
 *   timeWindows: [{ start: "18:00", end: "20:00" }],
 *   startDate: "2024-06-01",
 *   endDate: "2024-08-01",
 *   exDates: ["2024-06-14"]
 * }
 */

/**
 * Generate occurrences for a given repetition rule within an optional date range.
 * - Supports overnight windows: if end <= start on the same day, end is treated as next day
 * - Dates are treated in UTC to avoid local timezone shifts
 */
export type Occurrence = { start: string; end: string; date: string };

export function* generateOccurrences(
  repetition: Repetition,
  options?: { from?: string; to?: string }
): Generator<Occurrence> {
  const {
    frequency,
    interval,
    byWeekday,
    timeWindows,
    startDate,
    endDate,
    exDates,
  } = repetition;

  // Range setup
  const rangeStart = new Date(`${options?.from || startDate}T00:00:00.000Z`);
  const defaultTo = repetition.endDate
    ? new Date(`${repetition.endDate}T23:59:59.999Z`)
    : new Date(
        Date.UTC(
          rangeStart.getUTCFullYear() + 1,
          rangeStart.getUTCMonth(),
          rangeStart.getUTCDate(),
          23,
          59,
          59,
          999
        )
      ); // fallback: 1 year horizon
  const rangeEnd = new Date(
    `${options?.to || endDate || defaultTo.toISOString().slice(0, 10)}T23:59:59.999Z`
  );

  // Guards
  if (rangeEnd < rangeStart) return;

  // Pre-calc helpers
  const startAnchor = new Date(`${startDate}T00:00:00.000Z`);
  const excluded = new Set((exDates || []).map((d) => d));

  // Map iCal weekdays to JS getUTCDay(): SU=0..SA=6
  const weekdayMap: Record<Weekday, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  } as const;

  function isEnabledDay(current: Date): boolean {
    const dayIndex = Math.floor(
      (current.getTime() - startAnchor.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (dayIndex < 0) return false;
    const weekIndex = Math.floor(dayIndex / 7);
    const monthIndex =
      (current.getUTCFullYear() - startAnchor.getUTCFullYear()) * 12 +
      (current.getUTCMonth() - startAnchor.getUTCMonth());
    const weekday = current.getUTCDay();

    switch (frequency) {
      case "DAILY": {
        if (dayIndex % interval !== 0) return false;
        // If byWeekday provided, also filter by weekday
        if (byWeekday?.length) {
          return byWeekday.some((w) => weekdayMap[w] === weekday);
        }
        return true;
      }
      case "WEEKLY": {
        if (weekIndex % interval !== 0) return false;
        return byWeekday.some((w) => weekdayMap[w] === weekday);
      }
      case "MONTHLY": {
        if (monthIndex % interval !== 0) return false;
        // Filter by weekdays within allowed months
        return byWeekday.some((w) => weekdayMap[w] === weekday);
      }
      default:
        return false;
    }
  }

  function toUTCISO(
    year: number,
    monthZeroBased: number,
    day: number,
    time: string
  ): string {
    const [h, m] = time.split(":").map((n) => parseInt(n, 10));
    const d = new Date(Date.UTC(year, monthZeroBased, day, h, m, 0, 0));
    return d.toISOString();
  }

  // Iterate day by day within range
  for (
    let d = new Date(rangeStart);
    d <= rangeEnd;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const dateStr = `${y.toString().padStart(4, "0")}-${(m + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

    if (excluded.has(dateStr)) continue;
    if (!isEnabledDay(d)) continue;

    for (const window of timeWindows) {
      const startISO = toUTCISO(y, m, day, window.start);
      // End on same calendar date by default
      let endDateObj = new Date(toUTCISO(y, m, day, window.end));
      const startDateObj = new Date(startISO);
      if (endDateObj <= startDateObj) {
        // crosses midnight → next day
        endDateObj = new Date(endDateObj.getTime() + 24 * 60 * 60 * 1000);
      }

      // Skip if outside range entirely
      if (endDateObj < rangeStart || startDateObj > rangeEnd) continue;

      yield {
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString(),
        date: dateStr,
      };
    }
  }
}

/** Convenience helper to collect occurrences into an array */
export function listOccurrences(
  repetition: Repetition,
  options?: { from?: string; to?: string }
): Occurrence[] {
  return Array.from(generateOccurrences(repetition, options));
}

export type PlanListItem = {
  id: string;
  title: string;
  date: string;
  status: "committed" | "pending";
  activity: ActivityId;
  locations?: {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
  }[];
  participants?: { name: string; image?: string }[];
};
