import { describe, expect, test } from "bun:test";

import {
  APPLE_AUTH_PROVIDER,
  AUTH_PROVIDER_DEFINITIONS,
  CALENDAR_ADAPTER_DEFINITIONS,
  CALENDAR_CAPABILITY_DEFINITIONS,
  ANONYMOUS_AUTH_PROVIDER,
  DEV_AUTH_PROVIDER,
  GOOGLE_AUTH_PROVIDER,
  MICROSOFT_AUTH_PROVIDER,
  buildAuthStartPath,
  buildLoginPath,
  getCalendarAdapterDefinition,
  getCalendarCapabilitiesByLayer,
  getVisibleAuthProviders,
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
      "anonymous",
      "google",
      "apple",
      "microsoft",
      "dev",
    ]);
    expect(ANONYMOUS_AUTH_PROVIDER.loginStartPath).toBe("/api/auth/signin/anonymous");
    expect(ANONYMOUS_AUTH_PROVIDER.ctaLabel).toBe("Ohne Konto starten");
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

  test("accepts comma-separated scopes as stored by Better Auth", () => {
    expect(
      hasRequiredCalendarScopes(
        "openid,email,profile,https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/contacts",
        "google",
      ),
    ).toBe(true);
    expect(
      hasRequiredCalendarScopes(
        "openid,email,profile,https://www.googleapis.com/auth/contacts",
        "google",
      ),
    ).toBe(false);
  });

  test("returns null for unknown calendar adapters", () => {
    expect(getCalendarAdapterDefinition("unknown")).toBe(null);
  });

  test("keeps shared calendar core separate from provider-specific extras", () => {
    expect(getCalendarCapabilitiesByLayer("shared_core").map((definition) => definition.id)).toEqual([
      "availability_context",
      "calendar_copies",
      "event_import",
    ]);
    expect(getCalendarCapabilitiesByLayer("provider_extra").map((definition) => definition.id)).toEqual([
      "calendar_invites",
      "calendar_edit_links",
    ]);

    const inviteCapability = CALENDAR_CAPABILITY_DEFINITIONS.find(
      (definition) => definition.id === "calendar_invites",
    );
    expect(inviteCapability?.availability.apple).toBe("fallback_only");
    expect(inviteCapability?.availability.google).toBe("available");
  });

  test("builds provider-specific and generic login paths from one helper layer", () => {
    expect(buildAuthStartPath("anonymous", "/now")).toBe("/api/auth/signin/anonymous?callbackUrl=%2Fnow");
    expect(buildAuthStartPath("google", "/now")).toBe("/api/auth/signin/google?callbackUrl=%2Fnow");
    expect(buildAuthStartPath("dev", "/s/abc")).toBe("/api/auth/signin/dev?callbackUrl=%2Fs%2Fabc");
    expect(buildLoginPath("/e/demo")).toBe("/login?callbackUrl=%2Fe%2Fdemo");
    expect(buildLoginPath()).toBe("/login");
  });

  test("keeps Apple visible as a standard login path while Microsoft stays feature-gated", () => {
    expect(
      getVisibleAuthProviders(
        [ANONYMOUS_AUTH_PROVIDER, GOOGLE_AUTH_PROVIDER, APPLE_AUTH_PROVIDER, MICROSOFT_AUTH_PROVIDER],
        { microsoftEnabled: false },
      ).map((provider) => provider.id),
    ).toEqual(["anonymous", "google", "apple"]);

    expect(
      getVisibleAuthProviders(
        [ANONYMOUS_AUTH_PROVIDER, GOOGLE_AUTH_PROVIDER, APPLE_AUTH_PROVIDER, MICROSOFT_AUTH_PROVIDER],
        { anonymousEnabled: false, microsoftEnabled: false },
      ).map((provider) => provider.id),
    ).toEqual(["google", "apple"]);

    expect(
      getVisibleAuthProviders(
        [ANONYMOUS_AUTH_PROVIDER, GOOGLE_AUTH_PROVIDER, APPLE_AUTH_PROVIDER, MICROSOFT_AUTH_PROVIDER],
        { microsoftEnabled: true },
      ).map((provider) => provider.id),
    ).toEqual(["anonymous", "google", "apple", "microsoft"]);
  });
});
