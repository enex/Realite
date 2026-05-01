import { describe, expect, test } from "bun:test";

import { isHeicLike } from "@/src/lib/profile-image-client-process";

describe("isHeicLike", () => {
  test("detects heic mime", () => {
    expect(
      isHeicLike(new File([], "x", { type: "image/heic" })),
    ).toBe(true);
    expect(
      isHeicLike(new File([], "x", { type: "image/heif" })),
    ).toBe(true);
  });

  test("detects extension when type missing", () => {
    expect(isHeicLike(new File([], "IMG.heic", { type: "" }))).toBe(true);
    expect(isHeicLike(new File([], "IMG.HEIF", { type: "" }))).toBe(true);
  });

  test("rejects normal jpeg", () => {
    expect(
      isHeicLike(new File([], "a.jpg", { type: "image/jpeg" })),
    ).toBe(false);
  });
});
