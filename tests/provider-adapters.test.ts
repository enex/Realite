import { describe, expect, test } from "bun:test";

import {
  APPLE_AUTH_PROVIDER,
  AUTH_PROVIDER_DEFINITIONS,
  CALENDAR_ADAPTER_DEFINITIONS,
  DEV_AUTH_PROVIDER,
  GOOGLE_AUTH_PROVIDER,
  MICROSOFT_AUTH_PROVIDER,
  buildAuthStartPath,
  buildLoginPath,
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

  test("lists supported auth providers and planned calendar adapters in one place", () => {
    expect(AUTH_PROVIDER_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "google",
      "apple",
      "microsoft",
      "dev",
    ]);
    expect(CALENDAR_ADAPTER_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "google",
      "apple",
      "microsoft",
    ]);
    expect(APPLE_AUTH_PROVIDER.loginStartPath).toBe("/api/auth/signin/apple");
    expect(MICROSOFT_AUTH_PROVIDER.loginStartPath).toBe("/api/auth/signin/microsoft");
    expect(DEV_AUTH_PROVIDER.status).toBe("dev_only");
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

  test("builds provider-specific and generic login paths from one helper layer", () => {
    expect(buildAuthStartPath("google", "/now")).toBe("/api/auth/signin/google?callbackUrl=%2Fnow");
    expect(buildAuthStartPath("dev", "/s/abc")).toBe("/api/auth/signin/dev?callbackUrl=%2Fs%2Fabc");
    expect(buildLoginPath("/e/demo")).toBe("/login?callbackUrl=%2Fe%2Fdemo");
    expect(buildLoginPath()).toBe("/login");
  });
});
