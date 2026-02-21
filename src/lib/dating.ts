export const DATE_TAG = "#date";
export const DATE_TAG_ALIAS = "#dating";
export const DATE_MIN_AGE = 18;

export const DATING_GENDERS = ["woman", "man", "non_binary"] as const;
export type DatingGender = (typeof DATING_GENDERS)[number];

export type DateMissingRequirement =
  | "enable_mode"
  | "birth_year"
  | "adult"
  | "gender"
  | "must_be_single"
  | "sought_genders"
  | "sought_age_range";

export type DatingProfile = {
  userId: string;
  enabled: boolean;
  birthYear: number | null;
  gender: DatingGender | null;
  isSingle: boolean;
  soughtGenders: DatingGender[];
  soughtAgeMin: number | null;
  soughtAgeMax: number | null;
  soughtOnlySingles: boolean;
};

export type DatingProfileStatus = {
  unlocked: boolean;
  age: number | null;
  missingRequirements: DateMissingRequirement[];
};

export const EMPTY_DATING_PROFILE: Omit<DatingProfile, "userId"> = {
  enabled: false,
  birthYear: null,
  gender: null,
  isSingle: false,
  soughtGenders: [],
  soughtAgeMin: null,
  soughtAgeMax: null,
  soughtOnlySingles: false,
};

function toCanonicalDateTag(tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (normalized === DATE_TAG_ALIAS) {
    return DATE_TAG;
  }
  return normalized;
}

export function normalizeDateTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map(toCanonicalDateTag)
        .filter(Boolean),
    ),
  );
}

export function titleContainsDateTag(title: string) {
  return /(^|\s)#date(\b|$)|(^|\s)#dating(\b|$)/iu.test(title);
}

export function isDateTag(tag: string) {
  const normalized = toCanonicalDateTag(tag);
  return normalized === DATE_TAG;
}

export function normalizeDatingGenders(value: string[] | null | undefined) {
  const allowed = new Set<string>(DATING_GENDERS);
  const normalized = Array.from(
    new Set(
      (value ?? [])
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => allowed.has(entry)),
    ),
  );

  return normalized as DatingGender[];
}

export function serializeDatingGenders(genders: DatingGender[]) {
  return normalizeDatingGenders(genders).join(",");
}

export function parseDatingGenders(value: string | null | undefined) {
  if (!value) {
    return [] as DatingGender[];
  }

  return normalizeDatingGenders(value.split(","));
}

export function getAgeFromBirthYear(birthYear: number, now = new Date()) {
  return now.getUTCFullYear() - birthYear;
}

export function getDatingProfileStatus(profile: DatingProfile, now = new Date()): DatingProfileStatus {
  const missing: DateMissingRequirement[] = [];

  if (!profile.enabled) {
    missing.push("enable_mode");
  }

  let age: number | null = null;
  if (!profile.birthYear) {
    missing.push("birth_year");
  } else {
    age = getAgeFromBirthYear(profile.birthYear, now);
    if (age < DATE_MIN_AGE) {
      missing.push("adult");
    }
  }

  if (!profile.gender) {
    missing.push("gender");
  }

  if (!profile.isSingle) {
    missing.push("must_be_single");
  }

  if (!profile.soughtGenders.length) {
    missing.push("sought_genders");
  }

  if (
    profile.soughtAgeMin === null ||
    profile.soughtAgeMax === null ||
    profile.soughtAgeMin > profile.soughtAgeMax ||
    profile.soughtAgeMin < DATE_MIN_AGE ||
    profile.soughtAgeMax < DATE_MIN_AGE
  ) {
    missing.push("sought_age_range");
  }

  return {
    unlocked: missing.length === 0,
    age,
    missingRequirements: missing,
  };
}

export function isDatingMutualMatch(
  viewerProfile: DatingProfile,
  creatorProfile: DatingProfile,
  now = new Date(),
) {
  const viewerStatus = getDatingProfileStatus(viewerProfile, now);
  const creatorStatus = getDatingProfileStatus(creatorProfile, now);

  if (!viewerStatus.unlocked || !creatorStatus.unlocked) {
    return false;
  }

  if (!viewerProfile.gender || !creatorProfile.gender || viewerStatus.age === null || creatorStatus.age === null) {
    return false;
  }

  const viewerWantsCreatorGender = viewerProfile.soughtGenders.includes(creatorProfile.gender);
  const creatorWantsViewerGender = creatorProfile.soughtGenders.includes(viewerProfile.gender);
  if (!viewerWantsCreatorGender || !creatorWantsViewerGender) {
    return false;
  }

  const viewerAcceptsCreatorAge =
    viewerProfile.soughtAgeMin !== null &&
    viewerProfile.soughtAgeMax !== null &&
    creatorStatus.age >= viewerProfile.soughtAgeMin &&
    creatorStatus.age <= viewerProfile.soughtAgeMax;
  const creatorAcceptsViewerAge =
    creatorProfile.soughtAgeMin !== null &&
    creatorProfile.soughtAgeMax !== null &&
    viewerStatus.age >= creatorProfile.soughtAgeMin &&
    viewerStatus.age <= creatorProfile.soughtAgeMax;
  if (!viewerAcceptsCreatorAge || !creatorAcceptsViewerAge) {
    return false;
  }

  if (viewerProfile.soughtOnlySingles && !creatorProfile.isSingle) {
    return false;
  }
  if (creatorProfile.soughtOnlySingles && !viewerProfile.isSingle) {
    return false;
  }

  return true;
}
