import { describe, expect, test } from "bun:test";

import {
  ANONYMOUS_SESSION_DISPLAY_NAME,
  resolveSyncedAppUserName,
} from "@/src/lib/anonymous-session";

describe("resolveSyncedAppUserName", () => {
  test("keeps a stored real name when the session still sends the guest placeholder", () => {
    expect(
      resolveSyncedAppUserName(
        ANONYMOUS_SESSION_DISPLAY_NAME,
        "Maria Beispiel",
      ),
    ).toBe("Maria Beispiel");
  });

  test("stores the placeholder for new rows when nothing is stored yet", () => {
    expect(
      resolveSyncedAppUserName(ANONYMOUS_SESSION_DISPLAY_NAME, null),
    ).toBe(ANONYMOUS_SESSION_DISPLAY_NAME);
  });

  test("updates when the user has a new session display name", () => {
    expect(resolveSyncedAppUserName("Alex", "Gast")).toBe("Alex");
  });

  test("preserves the existing name when the session sends nothing", () => {
    expect(resolveSyncedAppUserName(null, "Sam")).toBe("Sam");
    expect(resolveSyncedAppUserName(undefined, "Sam")).toBe("Sam");
  });

  test("treats blank session names as missing", () => {
    expect(resolveSyncedAppUserName("  ", "Sam")).toBe("Sam");
  });
});
