import { describe, expect, test } from "bun:test";

import {
  DATE_TAG,
  getDatingProfileStatus,
  isDatingMutualMatch,
  normalizeDateTags,
  type DatingProfile
} from "@/src/lib/dating";

const NOW = new Date("2026-02-21T12:00:00.000Z");

function buildProfile(overrides: Partial<DatingProfile>): DatingProfile {
  return {
    userId: "user-a",
    enabled: true,
    birthYear: 1995,
    gender: "woman",
    isSingle: true,
    soughtGenders: ["man"],
    soughtAgeMin: 22,
    soughtAgeMax: 40,
    soughtOnlySingles: true,
    ...overrides
  };
}

describe("dating profile status", () => {
  test("locks profile while required fields are missing", () => {
    const profile = buildProfile({
      enabled: false,
      birthYear: null,
      gender: null,
      isSingle: false,
      soughtGenders: [],
      soughtAgeMin: null,
      soughtAgeMax: null
    });

    const status = getDatingProfileStatus(profile, NOW);
    expect(status.unlocked).toBe(false);
    expect(status.missingRequirements).toContain("enable_mode");
    expect(status.missingRequirements).toContain("birth_year");
    expect(status.missingRequirements).toContain("gender");
    expect(status.missingRequirements).toContain("must_be_single");
    expect(status.missingRequirements).toContain("sought_genders");
    expect(status.missingRequirements).toContain("sought_age_range");
  });

  test("requires adulthood (18+)", () => {
    const profile = buildProfile({
      birthYear: 2010
    });

    const status = getDatingProfileStatus(profile, NOW);
    expect(status.unlocked).toBe(false);
    expect(status.missingRequirements).toContain("adult");
  });
});

describe("mutual matching", () => {
  test("matches only when both profiles accept each other", () => {
    const viewer = buildProfile({
      userId: "viewer",
      gender: "woman",
      soughtGenders: ["man"],
      soughtAgeMin: 25,
      soughtAgeMax: 35
    });

    const creator = buildProfile({
      userId: "creator",
      gender: "man",
      birthYear: 1994,
      soughtGenders: ["woman"],
      soughtAgeMin: 24,
      soughtAgeMax: 34
    });

    expect(isDatingMutualMatch(viewer, creator, NOW)).toBe(true);
  });

  test("does not match when one side rejects the other", () => {
    const viewer = buildProfile({
      userId: "viewer",
      gender: "woman",
      soughtGenders: ["man"]
    });
    const creator = buildProfile({
      userId: "creator",
      gender: "man",
      soughtGenders: ["non_binary"]
    });

    expect(isDatingMutualMatch(viewer, creator, NOW)).toBe(false);
  });
});

describe("date tag normalization", () => {
  test("normalizes #dating alias to #date", () => {
    const tags = normalizeDateTags(["#dating", "#date", "#kontakte"]);
    expect(tags).toContain(DATE_TAG);
    expect(tags).not.toContain("#dating");
  });
});
