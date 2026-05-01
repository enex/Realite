import { describe, expect, test } from "bun:test";

import { createAdminSessionCookieValue, verifyAdminSessionCookieValue } from "@/src/lib/admin-session-token";

describe("admin-session-token", () => {
  test("roundtrip and expiry", async () => {
    const secret = "x".repeat(32);
    const token = createAdminSessionCookieValue(secret, 60);
    expect(verifyAdminSessionCookieValue(secret, token)).toBe(true);
    expect(verifyAdminSessionCookieValue("y".repeat(32), token)).toBe(false);
    expect(verifyAdminSessionCookieValue(secret, "nope")).toBe(false);
    expect(verifyAdminSessionCookieValue(secret, undefined)).toBe(false);
  });

  test("tampered payload fails", async () => {
    const secret = "a".repeat(24);
    const token = createAdminSessionCookieValue(secret, 3600);
    const [payload, sig] = token.split(".");
    expect(payload).toBeDefined();
    expect(sig).toBeDefined();
    const broken = `${payload.slice(0, -1)}x.${sig}`;
    expect(verifyAdminSessionCookieValue(secret, broken)).toBe(false);
  });
});
