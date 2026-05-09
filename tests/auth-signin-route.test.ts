import { describe, expect, test } from "bun:test";

import { getGoogleLoginAuthorizationLocation } from "@/src/lib/auth-signin-route";

describe("auth sign-in route", () => {
  test("keeps Google login from merging previously granted calendar or contacts scopes", () => {
    const requestUrl = new URL("https://realite.app/api/auth/signin/google");
    const location = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    location.searchParams.set("client_id", "client-id");
    location.searchParams.set("scope", "email profile openid");
    location.searchParams.set("include_granted_scopes", "true");

    const sanitized = new URL(
      getGoogleLoginAuthorizationLocation(location.toString(), requestUrl),
    );

    expect(sanitized.searchParams.get("scope")).toBe("email profile openid");
    expect(sanitized.searchParams.has("include_granted_scopes")).toBe(false);
  });

  test("keeps non-Google OAuth locations otherwise intact", () => {
    const requestUrl = new URL("https://realite.app/api/auth/signin/google");
    const location = "/callback/google?include_granted_scopes=true";

    const sanitized = new URL(
      getGoogleLoginAuthorizationLocation(location, requestUrl),
    );

    expect(sanitized.toString()).toBe(
      "https://realite.app/callback/google?include_granted_scopes=true",
    );
  });
});
