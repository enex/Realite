import { describe, expect, test } from "bun:test";

import { getSafePwaReturnPath } from "@/src/lib/pwa-return-path";

describe("pwa return path", () => {
  test("keeps safe app paths with query and hash", () => {
    expect(getSafePwaReturnPath("/q/abc123?s=poster#join")).toBe(
      "/q/abc123?s=poster#join",
    );
    expect(getSafePwaReturnPath("https://realite.app/singles/festival")).toBe(
      "/singles/festival",
    );
  });

  test("rejects external and technical targets", () => {
    expect(getSafePwaReturnPath("https://example.com/q/abc123")).toBe(null);
    expect(getSafePwaReturnPath("//example.com/q/abc123")).toBe(null);
    expect(getSafePwaReturnPath("/start")).toBe(null);
    expect(getSafePwaReturnPath("/api/qr/abc123")).toBe(null);
    expect(getSafePwaReturnPath("/_next/static/chunk.js")).toBe(null);
  });
});
