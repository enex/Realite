import { describe, expect, test } from "bun:test";

import { deriveCalendarConnectionState } from "@/src/lib/calendar-connection-state";

describe("deriveCalendarConnectionState", () => {
  test("returns not_connected without a saved provider connection", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: false,
        scope: null,
        writableCalendarCount: 0,
        readableCalendarCount: 0
      })
    ).toBe("not_connected");
  });

  test("returns connected when usable calendars are available", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        scope: "openid email https://www.googleapis.com/auth/calendar",
        writableCalendarCount: 1,
        readableCalendarCount: 2
      })
    ).toBe("connected");
  });

  test("returns needs_reconnect when the saved connection lost calendar access", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        scope: "openid email profile",
        writableCalendarCount: 0,
        readableCalendarCount: 0
      })
    ).toBe("needs_reconnect");
  });
});
