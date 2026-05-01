import { describe, expect, test } from "bun:test";

import {
  deriveCalendarConnectionState,
  deriveContactsConnectionState,
} from "@/src/lib/calendar-connection-state";

describe("deriveCalendarConnectionState", () => {
  test("returns not_connected without a saved provider connection", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: false,
        scope: null,
        writableCalendarCount: 0,
        readableCalendarCount: 0,
      }),
    ).toBe("not_connected");
  });

  test("returns connected when usable calendars are available", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        providerId: "google",
        scope: "openid email https://www.googleapis.com/auth/calendar",
        writableCalendarCount: 1,
        readableCalendarCount: 2,
      }),
    ).toBe("connected");
  });

  test("returns not_connected when connection exists but only has login scopes (new user after minimal login)", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        providerId: "google",
        scope: "openid email profile",
        writableCalendarCount: 0,
        readableCalendarCount: 0,
      }),
    ).toBe("not_connected");
  });

  test("returns needs_reconnect when calendar scopes were granted but no calendars are reachable (token revoked)", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        providerId: "google",
        scope: "openid email https://www.googleapis.com/auth/calendar",
        writableCalendarCount: 0,
        readableCalendarCount: 0,
      }),
    ).toBe("needs_reconnect");
  });

  test("returns connected when scopes are comma-separated (Better Auth format)", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        providerId: "google",
        scope: "openid,email,https://www.googleapis.com/auth/calendar",
        writableCalendarCount: 1,
        readableCalendarCount: 2,
      }),
    ).toBe("connected");
  });

  test("returns not_connected for providers without a calendar scope contract", () => {
    expect(
      deriveCalendarConnectionState({
        hasConnection: true,
        providerId: "apple",
        scope: "openid email profile",
        writableCalendarCount: 1,
        readableCalendarCount: 1,
      }),
    ).toBe("not_connected");
  });
});

describe("deriveContactsConnectionState", () => {
  test("returns not_connected when scope is null", () => {
    expect(deriveContactsConnectionState(null)).toBe("not_connected");
  });

  test("returns not_connected when only login scopes are present", () => {
    expect(deriveContactsConnectionState("openid email profile")).toBe(
      "not_connected",
    );
  });

  test("returns connected when contacts scopes are present", () => {
    expect(
      deriveContactsConnectionState(
        "openid email profile https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/contacts.readonly",
      ),
    ).toBe("connected");
  });

  test("returns not_connected when only read scope but not write scope is present", () => {
    expect(
      deriveContactsConnectionState(
        "openid email https://www.googleapis.com/auth/contacts.readonly",
      ),
    ).toBe("not_connected");
  });
});
