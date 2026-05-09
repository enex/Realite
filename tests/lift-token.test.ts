import { describe, expect, test } from "bun:test";

import { createLiftToken, verifyLiftToken } from "@/src/lib/lift-token";

const secret = "test-secret";
const ownerUserId = "7fb2e546-05e0-4acb-a7c9-4ba622ffefba";

describe("lift token", () => {
  test("encodes owner, singles slug, and a 30 minute expiry", () => {
    const now = new Date("2026-05-09T12:00:00.000Z");
    const token = createLiftToken({
      ownerUserId,
      singlesSlug: "Koeln Singles Ue30",
      now,
      secret,
    });

    const verified = verifyLiftToken({
      token,
      now: new Date("2026-05-09T12:29:59.000Z"),
      secret,
    });

    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.token.ownerUserId).toBe(ownerUserId);
    expect(verified.token.singlesSlug).toBe("koeln-singles-ue30");
    expect(verified.token.expiresAt.toISOString()).toBe(
      "2026-05-09T12:30:00.000Z",
    );
  });

  test("rejects expired or tampered tokens", () => {
    const token = createLiftToken({
      ownerUserId,
      singlesSlug: "koeln-singles-ue30",
      now: new Date("2026-05-09T12:00:00.000Z"),
      secret,
    });

    expect(
      verifyLiftToken({
        token,
        now: new Date("2026-05-09T12:30:00.000Z"),
        secret,
      }),
    ).toEqual({ ok: false, reason: "expired" });
    expect(
      verifyLiftToken({
        token: `${token.slice(0, -1)}x`,
        now: new Date("2026-05-09T12:05:00.000Z"),
        secret,
      }),
    ).toEqual({ ok: false, reason: "invalid" });
  });
});
