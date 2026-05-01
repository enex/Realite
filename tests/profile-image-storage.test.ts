import { describe, expect, test } from "bun:test";

import {
  canonicalizeProfileImageUrlForPersistence,
  extractProfileImageStorageKey,
  isStoredProfileImageUrl,
  parseProfileImageUserObjectKey,
  resolveS3SigningRegion,
} from "@/src/lib/profile-image-storage";

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

  test("OVH endpoint region is inferred when S3_REGION is auto or unset", () => {
    expect(
      resolveS3SigningRegion(
        "https://s3.sbg.io.cloud.ovh.net/",
        "auto",
      ),
    ).toBe("sbg");
    expect(
      resolveS3SigningRegion("https://s3.sbg.io.cloud.ovh.net", undefined),
    ).toBe("sbg");
  });

  test("explicit non-auto S3_REGION wins over OVH hostname", () => {
    expect(resolveS3SigningRegion("https://s3.sbg.io.cloud.ovh.net/", "gra")).toBe(
      "gra",
    );
  });

  test("non-OVH endpoints keep auto when region env is unset", () => {
    expect(
      resolveS3SigningRegion("https://account.r2.cloudflarestorage.com", undefined),
    ).toBe("auto");
  });

  test("canonicalize strips SigV4 query from stored URLs", () => {
    expect(
      canonicalizeProfileImageUrlForPersistence(
        "https://s3.sbg.io.cloud.ovh.net/bucket/profiles/u/x.webp?X-Amz-Signature=abc",
      ),
    ).toBe("https://s3.sbg.io.cloud.ovh.net/bucket/profiles/u/x.webp");
  });

  test("extractProfileImageStorageKey parses path-style object URL", () => {
    expect(
      extractProfileImageStorageKey(
        "https://s3.sbg.io.cloud.ovh.net/realite/profiles/u/uuid.webp",
      ),
    ).toBe("profiles/u/uuid.webp");
  });

  test("parseProfileImageUserObjectKey accepts profiles/<uuid>/<image.ext>", () => {
    const uid = "0198a1b2-c3d4-7e8f-9a0b-1c2d3e4f5067";
    expect(parseProfileImageUserObjectKey(`profiles/${uid}/0198a1b2-c3d4-7e8f-9a0b-1c2d3e4f5068.webp`)).toEqual({
      userId: uid,
      fileName: "0198a1b2-c3d4-7e8f-9a0b-1c2d3e4f5068.webp",
    });
    expect(parseProfileImageUserObjectKey(`profiles/${uid}/file.JPG`)).toEqual({
      userId: uid,
      fileName: "file.JPG",
    });
  });

  test("parseProfileImageUserObjectKey rejects bad paths", () => {
    expect(parseProfileImageUserObjectKey("profiles//x.webp")).toBe(null);
    expect(parseProfileImageUserObjectKey("other/u/x.webp")).toBe(null);
    expect(
      parseProfileImageUserObjectKey(
        "profiles/not-a-uuid/0198a1b2-c3d4-7e8f-9a0b-1c2d3e4f5068.webp",
      ),
    ).toBe(null);
    expect(
      parseProfileImageUserObjectKey(
        "profiles/0198a1b2-c3d4-7e8f-9a0b-1c2d3e4f5067/file.gif",
      ),
    ).toBe(null);
  });
});
