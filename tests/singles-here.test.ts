import { describe, expect, test } from "bun:test";

import type { DatingProfile } from "@/src/lib/dating";
import {
  buildSinglesHereEventTitle,
  filterSinglesHereMatches,
  isValidSinglesHereSlug,
  normalizeSinglesHereSlug,
} from "@/src/lib/singles-here";

const NOW = new Date("2026-05-01T12:00:00.000Z");

function profile(overrides: Partial<DatingProfile>): DatingProfile {
  return {
    userId: "viewer",
    enabled: true,
    birthYear: 1995,
    gender: "woman",
    isSingle: true,
    soughtGenders: ["man"],
    soughtAgeMin: 25,
    soughtAgeMax: 38,
    soughtOnlySingles: true,
    ...overrides,
  };
}

describe("singles here slug", () => {
  test("normalizes German event names to URL-safe slugs", () => {
    expect(normalizeSinglesHereSlug("Köln Singles Ü30!")).toBe(
      "koeln-singles-ue30",
    );
    expect(isValidSinglesHereSlug("koeln-singles-ue30")).toBe(true);
  });

  test("rejects too-short or edge-hyphen slugs", () => {
    expect(isValidSinglesHereSlug("a")).toBe(false);
    expect(isValidSinglesHereSlug("-party")).toBe(false);
    expect(isValidSinglesHereSlug("party-")).toBe(false);
  });
});

describe("singles here matching", () => {
  test("keeps only mutually matching checked-in people", () => {
    const viewer = profile({ userId: "viewer" });
    const matching = profile({
      userId: "matching",
      gender: "man",
      birthYear: 1994,
      soughtGenders: ["woman"],
      soughtAgeMin: 25,
      soughtAgeMax: 35,
    });
    const rejected = profile({
      userId: "rejected",
      gender: "man",
      birthYear: 1994,
      soughtGenders: ["non_binary"],
    });

    expect(
      filterSinglesHereMatches({
        viewerProfile: viewer,
        candidates: [
          { userId: "viewer", profile: viewer },
          { userId: "matching", profile: matching },
          { userId: "rejected", profile: rejected },
        ],
        now: NOW,
      }).map((candidate) => candidate.userId),
    ).toEqual(["matching"]);
  });

  test("shows no matches until the viewer profile is complete", () => {
    expect(
      filterSinglesHereMatches({
        viewerProfile: profile({ enabled: false }),
        candidates: [
          {
            userId: "matching",
            profile: profile({
              userId: "matching",
              gender: "man",
              soughtGenders: ["woman"],
            }),
          },
        ],
        now: NOW,
      }),
    ).toEqual([]);
  });
});

describe("singles here title", () => {
  test("adds the date tag for the event model", () => {
    expect(buildSinglesHereEventTitle("Campus Party")).toBe("Campus Party #date");
  });
});
