import { describe, expect, test } from "bun:test";

import {
  AUTH_PROVIDER_DEFINITIONS,
  CALENDAR_ADAPTER_DEFINITIONS,
  GOOGLE_AUTH_PROVIDER,
  getCalendarAdapterDefinition,
  hasRequiredCalendarScopes,
} from "@/src/lib/provider-adapters";

describe("provider adapters", () => {
  test("keeps Google auth scopes in the central provider definition", () => {
    expect(GOOGLE_AUTH_PROVIDER.scopes).toContain(
      "https://www.googleapis.com/auth/calendar",
    );
    expect(GOOGLE_AUTH_PROVIDER.scopes).toContain(
      "https://www.googleapis.com/auth/contacts",
    );
  });

  test("lists planned auth and calendar adapters alongside the active Google path", () => {
    expect(AUTH_PROVIDER_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "google",
      "apple",
      "email",
    ]);
    expect(CALENDAR_ADAPTER_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "google",
      "apple",
      "microsoft",
    ]);
  });

  test("matches required scopes through the adapter definition instead of hardcoded checks", () => {
    expect(
      hasRequiredCalendarScopes(
        "openid email https://www.googleapis.com/auth/calendar",
        "google",
      ),
    ).toBe(true);
    expect(hasRequiredCalendarScopes("openid email profile", "google")).toBe(false);
  });

  test("returns null for unknown calendar adapters", () => {
    expect(getCalendarAdapterDefinition("unknown")).toBe(null);
  });
});
