import {
  getDatingProfileStatus,
  isDatingMutualMatch,
  type DatingProfile,
} from "@/src/lib/dating";

export const SINGLES_HERE_SOURCE_PROVIDER = "realite_singles_here";

export type SinglesHereMatchCandidate = {
  userId: string;
  profile: DatingProfile;
};

export function normalizeSinglesHereSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isValidSinglesHereSlug(value: string) {
  return (
    value.length >= 2 &&
    value.length <= 64 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(value)
  );
}

export function buildSinglesHereEventTitle(name: string) {
  return `${name.trim()} #date`;
}

export function filterSinglesHereMatches(input: {
  viewerProfile: DatingProfile;
  candidates: SinglesHereMatchCandidate[];
  now?: Date;
}) {
  const viewerStatus = getDatingProfileStatus(input.viewerProfile, input.now);
  if (!viewerStatus.unlocked) {
    return [];
  }

  return input.candidates.filter((candidate) => {
    if (candidate.userId === input.viewerProfile.userId) {
      return false;
    }

    return isDatingMutualMatch(
      input.viewerProfile,
      candidate.profile,
      input.now,
    );
  });
}
