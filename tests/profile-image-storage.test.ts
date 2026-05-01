import { describe, expect, test } from "bun:test";

import { isStoredProfileImageUrl } from "@/src/lib/profile-image-storage";

describe("profile image storage", () => {
  test("recognizes Realite stored profile images under the profile prefix", () => {
    expect(
      isStoredProfileImageUrl("https://cdn.example.com/realite/profiles/user/image.webp"),
    ).toBe(true);
  });

  test("does not treat provider profile photos as stored Realite uploads", () => {
    expect(
      isStoredProfileImageUrl("https://lh3.googleusercontent.com/a/example"),
    ).toBe(false);
    expect(isStoredProfileImageUrl(null)).toBe(false);
  });
});
