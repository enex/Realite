import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  calendarConnections,
  datingProfiles,
  eventTags,
  events,
  groupContacts,
  groupMemberships,
  groups,
  inviteLinks,
  suggestions,
  tagPreferences,
  userSettings,
  users
} from "@/src/db/schema";
import {
  DATE_TAG,
  EMPTY_DATING_PROFILE,
  getDatingProfileStatus,
  isDateTag,
  isDatingMutualMatch,
  normalizeDateTags,
  normalizeDatingGenders,
  parseDatingGenders,
  serializeDatingGenders,
  titleContainsDateTag,
  type DateMissingRequirement,
  type DatingGender,
  type DatingProfile
} from "@/src/lib/dating";
import {
  type DeclineReason,
  createLocationPreferenceTag,
  createPersonPreferenceTag,
  createTimeslotPreferenceTag,
  normalizeDecisionNote,
  normalizeDecisionReasons,
  parseDecisionReasons,
  serializeDecisionReasons
} from "@/src/lib/suggestion-feedback";

export type GroupVisibility = "public" | "private";
export type EventVisibility = "public" | "group" | "smart_date";
export type SuggestionStatus = "pending" | "calendar_inserted" | "accepted" | "declined";
export type SuggestionDeclineReason = DeclineReason;

export class RepositoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryValidationError";
  }
}

export type UserSuggestionSettings = {
  autoInsertSuggestions: boolean;
  suggestionCalendarId: string;
  suggestionDeliveryMode: "calendar_copy" | "source_invite";
  shareEmailInSourceInvites: boolean;
  matchingCalendarIds: string[];
  blockedCreatorIds: string[];
  blockedActivityTags: string[];
  suggestionLimitPerDay: number;
  suggestionLimitPerWeek: number;
};

export type SuggestionLearningCriterion = {
  key: string;
  label: string;
  weight: number;
  votes: number;
};

export type SuggestionLearningSummary = {
  positiveCriteria: SuggestionLearningCriterion[];
  negativeCriteria: SuggestionLearningCriterion[];
  blockedPeople: Array<{ id: string; label: string }>;
  blockedActivityTags: string[];
};

export type VisibleEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  visibility: EventVisibility;
  groupId: string | null;
  groupName: string | null;
  createdBy: string;
  sourceProvider: string | null;
  sourceEventId: string | null;
  tags: string[];
};

export type PublicEventSharePreview = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  createdByName: string | null;
  createdByEmail: string | null;
};

export type GroupContact = {
  groupId: string;
  email: string;
  emails: string[];
  name: string | null;
  image: string | null;
  isRegistered: boolean;
  source: string;
};

export type UserProfileVisibility = "public_alle" | "matched" | "owner";

export type UserProfileEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  visibility: EventVisibility;
  groupName: string | null;
  tags: string[];
  matchStatus: SuggestionStatus | null;
};

export type UserProfileOverview = {
  profile: {
    id: string;
    name: string | null;
    image: string | null;
    createdAt: Date;
  };
  visibility: UserProfileVisibility;
  events: UserProfileEvent[];
};

export type UserDatingProfile = DatingProfile;
export type DateHashtagStatus = {
  profile: UserDatingProfile;
  unlocked: boolean;
  age: number | null;
  missingRequirements: DateMissingRequirement[];
};

function normalizeTags(tags: string[]) {
  const normalized = normalizeDateTags(
    tags
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
  );

  return normalized;
}

function normalizeGroupHashtags(hashtags?: string[] | null) {
  const normalized = Array.from(
    new Set(
      (hashtags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    )
  );

  if (!normalized.length) {
    return ["#alle"];
  }

  return normalized;
}

function serializeGroupHashtags(hashtags?: string[] | null) {
  return normalizeGroupHashtags(hashtags).join(",");
}

function parseGroupHashtags(value: string | null | undefined) {
  if (!value) {
    return ["#alle"];
  }

  return normalizeGroupHashtags(value.split(","));
}

function titleContainsAlleTag(title: string) {
  return /(^|\s)#alle(\b|$)/iu.test(title);
}

function titleContainsKontakteTag(title: string) {
  return /(^|\s)#kontakte(\b|$)/iu.test(title);
}

function isAlleGroupName(name: string) {
  return name.trim().toLowerCase() === "#alle";
}

function isKontakteGroupName(name: string) {
  return name.trim().toLowerCase() === "#kontakte";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSuggestionDeliveryMode(value: string | null | undefined): "calendar_copy" | "source_invite" {
  return value === "source_invite" ? "source_invite" : "calendar_copy";
}

function normalizeStringList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeCalendarIdList(ids: string[]) {
  return normalizeStringList(ids);
}

function parseCalendarIdList(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return normalizeCalendarIdList(value.split(","));
}

function serializeCalendarIdList(ids: string[]) {
  return normalizeCalendarIdList(ids).join(",");
}

const RESERVED_ACTIVITY_TAGS = new Set(["#alle", "#kontakte", DATE_TAG]);

function normalizeBlockedActivityTags(tags: string[]) {
  return normalizeTags(tags).filter((tag) => !RESERVED_ACTIVITY_TAGS.has(tag));
}

function parseBlockedActivityTags(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return normalizeBlockedActivityTags(value.split(","));
}

function serializeBlockedActivityTags(tags: string[]) {
  return normalizeBlockedActivityTags(tags).join(",");
}

function parseStringList(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return normalizeStringList(value.split(","));
}

function serializeStringList(values: string[]) {
  return normalizeStringList(values).join(",");
}

function normalizeSuggestionLimit(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);
  if (integer < 1) {
    return 1;
  }

  if (integer > 200) {
    return 200;
  }

  return integer;
}

function normalizeSuggestionReason(reason: string) {
  const fallback = "Match basierend auf deinen bisherigen Entscheidungen und freier Zeit im Kalender";
  const trimmed = reason.trim();

  if (!trimmed) {
    return fallback;
  }

  return /(^|\s)#[\p{L}\p{N}_-]+/u.test(trimmed) ? fallback : trimmed;
}

function createDefaultDatingProfile(userId: string): UserDatingProfile {
  return {
    userId,
    ...EMPTY_DATING_PROFILE
  };
}

function mapDatingProfileRow(row: {
  userId: string;
  enabled: boolean;
  birthYear: number | null;
  gender: DatingGender | null;
  isSingle: boolean;
  soughtGenders: string;
  soughtAgeMin: number | null;
  soughtAgeMax: number | null;
  soughtOnlySingles: boolean;
}): UserDatingProfile {
  return {
    userId: row.userId,
    enabled: row.enabled,
    birthYear: row.birthYear,
    gender: row.gender,
    isSingle: row.isSingle,
    soughtGenders: parseDatingGenders(row.soughtGenders),
    soughtAgeMin: row.soughtAgeMin,
    soughtAgeMax: row.soughtAgeMax,
    soughtOnlySingles: row.soughtOnlySingles
  };
}

function getDateUnlockStatus(profile: UserDatingProfile) {
  return getDatingProfileStatus(profile);
}

export async function upsertUser(input: { email: string; name?: string | null; image?: string | null }) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(users)
      .set({
        email: normalizedEmail,
        name: input.name ?? existing[0].name,
        image: input.image ?? existing[0].image,
        updatedAt: new Date()
      })
      .where(eq(users.id, existing[0].id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name: input.name ?? null,
      image: input.image ?? null,
      updatedAt: new Date()
    })
    .returning();

  return created;
}

export async function getUserByEmail(email: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);
  return user ?? null;
}

export async function getUserById(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function deleteUserById(userId: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return deleted ?? null;
}

export async function deleteGroupContactsByEmail(email: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  await db.delete(groupContacts).where(sql`lower(${groupContacts.email}) = ${normalizedEmail}`);
}

export async function upsertGoogleConnection(input: {
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
}) {
  const db = getDb();
  const updateValues: {
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiresAt: Date | null;
    scope: string | null;
    updatedAt: Date;
  } = {
    accessToken: input.accessToken,
    tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt * 1000) : null,
    scope: input.scope ?? null,
    updatedAt: new Date()
  };

  if (input.refreshToken) {
    updateValues.refreshToken = input.refreshToken;
  }

  await db
    .insert(calendarConnections)
    .values({
      userId: input.userId,
      provider: "google",
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt * 1000) : null,
      scope: input.scope ?? null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.provider],
      set: updateValues
    });
}

export async function updateGoogleConnectionTokens(input: {
  userId: string;
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
}) {
  const db = getDb();
  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null;
  const updateValues: {
    accessToken: string;
    tokenExpiresAt: Date | null;
    refreshToken?: string;
    updatedAt: Date;
  } = {
    accessToken: input.accessToken,
    tokenExpiresAt: expiresAt,
    updatedAt: new Date()
  };

  if (input.refreshToken) {
    updateValues.refreshToken = input.refreshToken;
  }

  await db
    .update(calendarConnections)
    .set(updateValues)
    .where(and(eq(calendarConnections.userId, input.userId), eq(calendarConnections.provider, "google")));
}

export async function getGoogleConnection(userId: string) {
  const db = getDb();
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, "google")))
    .limit(1);

  return connection ?? null;
}

export async function ensureUserSuggestionSettings(userId: string) {
  const db = getDb();

  await db
    .insert(userSettings)
    .values({
      userId,
      autoInsertSuggestions: true,
      suggestionCalendarId: "primary",
      suggestionDeliveryMode: "calendar_copy",
      shareEmailInSourceInvites: true,
      matchingCalendarIds: "",
      blockedCreatorIds: "",
      blockedActivityTags: "",
      suggestionLimitPerDay: 4,
      suggestionLimitPerWeek: 16,
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: [userSettings.userId] });
}

export async function ensureUserDatingProfile(userId: string) {
  const db = getDb();

  await db
    .insert(datingProfiles)
    .values({
      userId,
      enabled: false,
      birthYear: null,
      gender: null,
      isSingle: false,
      soughtGenders: "",
      soughtAgeMin: null,
      soughtAgeMax: null,
      soughtOnlySingles: false,
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: [datingProfiles.userId] });
}

export async function getUserDatingProfile(userId: string): Promise<UserDatingProfile> {
  const db = getDb();
  await ensureUserDatingProfile(userId);

  const [profile] = await db
    .select({
      userId: datingProfiles.userId,
      enabled: datingProfiles.enabled,
      birthYear: datingProfiles.birthYear,
      gender: datingProfiles.gender,
      isSingle: datingProfiles.isSingle,
      soughtGenders: datingProfiles.soughtGenders,
      soughtAgeMin: datingProfiles.soughtAgeMin,
      soughtAgeMax: datingProfiles.soughtAgeMax,
      soughtOnlySingles: datingProfiles.soughtOnlySingles
    })
    .from(datingProfiles)
    .where(eq(datingProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return createDefaultDatingProfile(userId);
  }

  return mapDatingProfileRow(profile);
}

export async function updateUserDatingProfile(input: {
  userId: string;
  enabled: boolean;
  birthYear: number | null;
  gender: DatingGender | null;
  isSingle: boolean;
  soughtGenders: DatingGender[];
  soughtAgeMin: number | null;
  soughtAgeMax: number | null;
  soughtOnlySingles: boolean;
}): Promise<UserDatingProfile> {
  const db = getDb();
  const normalizedSoughtGenders = normalizeDatingGenders(input.soughtGenders);

  const [profile] = await db
    .insert(datingProfiles)
    .values({
      userId: input.userId,
      enabled: input.enabled,
      birthYear: input.birthYear,
      gender: input.gender,
      isSingle: input.isSingle,
      soughtGenders: serializeDatingGenders(normalizedSoughtGenders),
      soughtAgeMin: input.soughtAgeMin,
      soughtAgeMax: input.soughtAgeMax,
      soughtOnlySingles: input.soughtOnlySingles,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [datingProfiles.userId],
      set: {
        enabled: input.enabled,
        birthYear: input.birthYear,
        gender: input.gender,
        isSingle: input.isSingle,
        soughtGenders: serializeDatingGenders(normalizedSoughtGenders),
        soughtAgeMin: input.soughtAgeMin,
        soughtAgeMax: input.soughtAgeMax,
        soughtOnlySingles: input.soughtOnlySingles,
        updatedAt: new Date()
      }
    })
    .returning({
      userId: datingProfiles.userId,
      enabled: datingProfiles.enabled,
      birthYear: datingProfiles.birthYear,
      gender: datingProfiles.gender,
      isSingle: datingProfiles.isSingle,
      soughtGenders: datingProfiles.soughtGenders,
      soughtAgeMin: datingProfiles.soughtAgeMin,
      soughtAgeMax: datingProfiles.soughtAgeMax,
      soughtOnlySingles: datingProfiles.soughtOnlySingles
    });

  if (!profile) {
    return createDefaultDatingProfile(input.userId);
  }

  return mapDatingProfileRow(profile);
}

export async function getDateHashtagStatus(userId: string): Promise<DateHashtagStatus> {
  const profile = await getUserDatingProfile(userId);
  const status = getDateUnlockStatus(profile);

  return {
    profile,
    unlocked: status.unlocked,
    age: status.age,
    missingRequirements: status.missingRequirements
  };
}

async function getDatingProfileMapForUsers(userIds: string[]) {
  const normalizedIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (!normalizedIds.length) {
    return new Map<string, UserDatingProfile>();
  }

  const db = getDb();
  const rows = await db
    .select({
      userId: datingProfiles.userId,
      enabled: datingProfiles.enabled,
      birthYear: datingProfiles.birthYear,
      gender: datingProfiles.gender,
      isSingle: datingProfiles.isSingle,
      soughtGenders: datingProfiles.soughtGenders,
      soughtAgeMin: datingProfiles.soughtAgeMin,
      soughtAgeMax: datingProfiles.soughtAgeMax,
      soughtOnlySingles: datingProfiles.soughtOnlySingles
    })
    .from(datingProfiles)
    .where(inArray(datingProfiles.userId, normalizedIds));

  const byUserId = new Map<string, UserDatingProfile>();
  for (const row of rows) {
    byUserId.set(row.userId, mapDatingProfileRow(row));
  }

  for (const userId of normalizedIds) {
    if (!byUserId.has(userId)) {
      byUserId.set(userId, createDefaultDatingProfile(userId));
    }
  }

  return byUserId;
}

export async function getUserSuggestionSettings(userId: string): Promise<UserSuggestionSettings> {
  const db = getDb();
  await ensureUserSuggestionSettings(userId);

  const [settings] = await db
    .select({
      autoInsertSuggestions: userSettings.autoInsertSuggestions,
      suggestionCalendarId: userSettings.suggestionCalendarId,
      suggestionDeliveryMode: userSettings.suggestionDeliveryMode,
      shareEmailInSourceInvites: userSettings.shareEmailInSourceInvites,
      matchingCalendarIds: userSettings.matchingCalendarIds,
      blockedCreatorIds: userSettings.blockedCreatorIds,
      blockedActivityTags: userSettings.blockedActivityTags,
      suggestionLimitPerDay: userSettings.suggestionLimitPerDay,
      suggestionLimitPerWeek: userSettings.suggestionLimitPerWeek
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return (
    settings
      ? {
          ...settings,
          suggestionDeliveryMode: normalizeSuggestionDeliveryMode(settings.suggestionDeliveryMode),
          matchingCalendarIds: parseCalendarIdList(settings.matchingCalendarIds),
          blockedCreatorIds: parseStringList(settings.blockedCreatorIds),
          blockedActivityTags: parseBlockedActivityTags(settings.blockedActivityTags),
          suggestionLimitPerDay: normalizeSuggestionLimit(settings.suggestionLimitPerDay, 4),
          suggestionLimitPerWeek: normalizeSuggestionLimit(settings.suggestionLimitPerWeek, 16)
        }
      : {
          autoInsertSuggestions: true,
          suggestionCalendarId: "primary",
          suggestionDeliveryMode: "calendar_copy",
          shareEmailInSourceInvites: true,
          matchingCalendarIds: [],
          blockedCreatorIds: [],
          blockedActivityTags: [],
          suggestionLimitPerDay: 4,
          suggestionLimitPerWeek: 16
        }
  );
}

export async function updateUserSuggestionSettings(input: {
  userId: string;
  autoInsertSuggestions: boolean;
  suggestionCalendarId: string;
  suggestionDeliveryMode: "calendar_copy" | "source_invite";
  shareEmailInSourceInvites: boolean;
  matchingCalendarIds: string[];
  blockedCreatorIds: string[];
  blockedActivityTags: string[];
  suggestionLimitPerDay: number;
  suggestionLimitPerWeek: number;
}): Promise<UserSuggestionSettings> {
  const db = getDb();
  const serializedMatchingCalendarIds = serializeCalendarIdList(input.matchingCalendarIds);
  const serializedBlockedCreatorIds = serializeStringList(input.blockedCreatorIds);
  const serializedBlockedActivityTags = serializeBlockedActivityTags(input.blockedActivityTags);
  const suggestionLimitPerDay = normalizeSuggestionLimit(input.suggestionLimitPerDay, 4);
  const suggestionLimitPerWeek = normalizeSuggestionLimit(input.suggestionLimitPerWeek, 16);

  const [settings] = await db
    .insert(userSettings)
    .values({
      userId: input.userId,
      autoInsertSuggestions: input.autoInsertSuggestions,
      suggestionCalendarId: input.suggestionCalendarId,
      suggestionDeliveryMode: input.suggestionDeliveryMode,
      shareEmailInSourceInvites: input.shareEmailInSourceInvites,
      matchingCalendarIds: serializedMatchingCalendarIds,
      blockedCreatorIds: serializedBlockedCreatorIds,
      blockedActivityTags: serializedBlockedActivityTags,
      suggestionLimitPerDay,
      suggestionLimitPerWeek,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [userSettings.userId],
      set: {
        autoInsertSuggestions: input.autoInsertSuggestions,
        suggestionCalendarId: input.suggestionCalendarId,
        suggestionDeliveryMode: input.suggestionDeliveryMode,
        shareEmailInSourceInvites: input.shareEmailInSourceInvites,
        matchingCalendarIds: serializedMatchingCalendarIds,
        blockedCreatorIds: serializedBlockedCreatorIds,
        blockedActivityTags: serializedBlockedActivityTags,
        suggestionLimitPerDay,
        suggestionLimitPerWeek,
        updatedAt: new Date()
      }
    })
    .returning({
      autoInsertSuggestions: userSettings.autoInsertSuggestions,
      suggestionCalendarId: userSettings.suggestionCalendarId,
      suggestionDeliveryMode: userSettings.suggestionDeliveryMode,
      shareEmailInSourceInvites: userSettings.shareEmailInSourceInvites,
      matchingCalendarIds: userSettings.matchingCalendarIds,
      blockedCreatorIds: userSettings.blockedCreatorIds,
      blockedActivityTags: userSettings.blockedActivityTags,
      suggestionLimitPerDay: userSettings.suggestionLimitPerDay,
      suggestionLimitPerWeek: userSettings.suggestionLimitPerWeek
    });

  return {
    autoInsertSuggestions: settings?.autoInsertSuggestions ?? input.autoInsertSuggestions,
    suggestionCalendarId: settings?.suggestionCalendarId ?? input.suggestionCalendarId,
    suggestionDeliveryMode: normalizeSuggestionDeliveryMode(settings?.suggestionDeliveryMode ?? input.suggestionDeliveryMode),
    shareEmailInSourceInvites: settings?.shareEmailInSourceInvites ?? input.shareEmailInSourceInvites,
    matchingCalendarIds: parseCalendarIdList(settings?.matchingCalendarIds ?? serializedMatchingCalendarIds),
    blockedCreatorIds: parseStringList(settings?.blockedCreatorIds ?? serializedBlockedCreatorIds),
    blockedActivityTags: parseBlockedActivityTags(settings?.blockedActivityTags ?? serializedBlockedActivityTags),
    suggestionLimitPerDay: normalizeSuggestionLimit(settings?.suggestionLimitPerDay ?? suggestionLimitPerDay, 4),
    suggestionLimitPerWeek: normalizeSuggestionLimit(settings?.suggestionLimitPerWeek ?? suggestionLimitPerWeek, 16)
  };
}

export async function createGroup(input: {
  userId: string;
  name: string;
  description?: string;
  hashtags?: string[];
  visibility: GroupVisibility;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: input.name,
        description: input.description ?? null,
        hashtag: serializeGroupHashtags(input.hashtags),
        visibility: input.visibility,
        createdBy: input.userId
      })
      .returning();

    await tx.insert(groupMemberships).values({
      groupId: group.id,
      userId: input.userId,
      role: "owner"
    });

    return {
      ...group,
      hashtags: parseGroupHashtags(group.hashtag)
    };
  });
}

export async function ensureAlleGroupForUser(userId: string) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(groups)
    .where(or(sql`lower(${groups.name}) = '#alle'`, sql`lower(${groups.hashtag}) like '%#alle%'`))
    .orderBy(sql`case when lower(${groups.name}) = '#alle' then 0 else 1 end`, groups.createdAt)
    .limit(1);

  let group = existing;

  if (!group) {
    [group] = await db
      .insert(groups)
      .values({
        name: "#alle",
        description: "Globale Realite Gruppe für alle öffentlichen Events mit #alle im Titel.",
        hashtag: "#alle",
        visibility: "public",
        createdBy: userId
      })
      .returning();
  }

  const normalizedHashtags = normalizeGroupHashtags([...parseGroupHashtags(group.hashtag), "#alle"]);
  const serializedHashtags = normalizedHashtags.join(",");

  if (!isAlleGroupName(group.name) || group.visibility !== "public" || group.hashtag !== serializedHashtags) {
    [group] = await db
      .update(groups)
      .set({
        name: "#alle",
        visibility: "public",
        hashtag: serializedHashtags
      })
      .where(eq(groups.id, group.id))
      .returning();
  }

  await db
    .insert(groupMemberships)
    .values({
      groupId: group.id,
      userId,
      role: "member"
    })
    .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.userId] });

  return {
    ...group,
    hashtags: parseGroupHashtags(group.hashtag)
  };
}

export async function ensureKontakteGroupForUser(userId: string) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(groups)
    .where(
      and(
        eq(groups.createdBy, userId),
        or(
          and(eq(groups.syncProvider, "google_contacts"), eq(groups.syncReference, "contactGroups/myContacts")),
          sql`lower(${groups.name}) = '#kontakte'`
        )
      )
    )
    .orderBy(
      sql`case when ${groups.syncProvider} = 'google_contacts' and ${groups.syncReference} = 'contactGroups/myContacts' then 0 else 1 end`,
      groups.createdAt
    )
    .limit(1);

  let group = existing;

  if (!group) {
    [group] = await db
      .insert(groups)
      .values({
        name: "#kontakte",
        description: "Für alle Kontakte aus Google Kontakte (automatisch synchronisiert).",
        hashtag: "#kontakte",
        visibility: "private",
        syncProvider: "google_contacts",
        syncReference: "contactGroups/myContacts",
        syncEnabled: true,
        createdBy: userId
      })
      .returning();
  }

  const normalizedHashtags = normalizeGroupHashtags([...parseGroupHashtags(group.hashtag), "#kontakte"]);
  const serializedHashtags = normalizedHashtags.join(",");

  if (
    !isKontakteGroupName(group.name) ||
    group.hashtag !== serializedHashtags ||
    group.syncProvider !== "google_contacts" ||
    group.syncReference !== "contactGroups/myContacts" ||
    group.syncEnabled !== true
  ) {
    [group] = await db
      .update(groups)
      .set({
        name: "#kontakte",
        hashtag: serializedHashtags,
        syncProvider: "google_contacts",
        syncReference: "contactGroups/myContacts",
        syncEnabled: true
      })
      .where(eq(groups.id, group.id))
      .returning();
  }

  await db
    .insert(groupMemberships)
    .values({
      groupId: group.id,
      userId,
      role: "owner"
    })
    .onConflictDoUpdate({
      target: [groupMemberships.groupId, groupMemberships.userId],
      set: { role: "owner" }
    });

  return {
    ...group,
    hashtags: parseGroupHashtags(group.hashtag)
  };
}

export async function upsertGoogleContactsLabelGroup(input: {
  userId: string;
  labelName: string;
  labelResourceName: string;
  hashtags?: string[];
}) {
  const db = getDb();
  const labelName = input.labelName.trim();
  const hashtags = normalizeGroupHashtags(input.hashtags ?? []);

  const [existing] = await db
    .select()
    .from(groups)
    .where(
      and(
        eq(groups.createdBy, input.userId),
        eq(groups.syncProvider, "google_contacts"),
        eq(groups.syncReference, input.labelResourceName)
      )
    )
    .limit(1);

  let group = existing;

  if (!group) {
    [group] = await db
      .insert(groups)
      .values({
        name: labelName,
        description: "Aus Google Kontakte Label synchronisiert.",
        hashtag: serializeGroupHashtags(hashtags),
        visibility: "private",
        syncProvider: "google_contacts",
        syncReference: input.labelResourceName,
        syncEnabled: true,
        createdBy: input.userId
      })
      .returning();
  } else {
    [group] = await db
      .update(groups)
      .set({
        name: labelName,
        hashtag: serializeGroupHashtags(hashtags),
        syncEnabled: true
      })
      .where(eq(groups.id, group.id))
      .returning();
  }

  await db
    .insert(groupMemberships)
    .values({
      groupId: group.id,
      userId: input.userId,
      role: "owner"
    })
    .onConflictDoUpdate({
      target: [groupMemberships.groupId, groupMemberships.userId],
      set: { role: "owner" }
    });

  return {
    ...group,
    hashtags: parseGroupHashtags(group.hashtag)
  };
}

export async function listGroupsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      hashtag: groups.hashtag,
      visibility: groups.visibility,
      syncProvider: groups.syncProvider,
      syncReference: groups.syncReference,
      syncEnabled: groups.syncEnabled,
      isHidden: groups.isHidden,
      role: groupMemberships.role,
      createdAt: groups.createdAt
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(eq(groupMemberships.userId, userId))
    .orderBy(desc(groups.createdAt));

  return rows.map((row) => ({
    ...row,
    hashtags: parseGroupHashtags(row.hashtag)
  }));
}

export async function setGroupHiddenState(input: {
  groupId: string;
  userId: string;
  isHidden: boolean;
}) {
  const db = getDb();
  const [membership] = await db
    .select({
      role: groupMemberships.role,
      syncProvider: groups.syncProvider
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.groupId, input.groupId), eq(groupMemberships.userId, input.userId)))
    .limit(1);

  if (!membership) {
    throw new Error("Keine Berechtigung für diese Gruppe");
  }

  if (membership.role !== "owner") {
    throw new Error("Nur Owner dürfen diese Gruppe ausblenden oder einblenden");
  }

  if (!membership.syncProvider) {
    throw new Error("Nur synchronisierte Gruppen können ausgeblendet werden");
  }

  const [group] = await db
    .update(groups)
    .set({
      isHidden: input.isHidden
    })
    .where(eq(groups.id, input.groupId))
    .returning();

  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  return {
    ...group,
    hashtags: parseGroupHashtags(group.hashtag)
  };
}

export async function deleteOrHideGroup(input: { groupId: string; userId: string }) {
  const db = getDb();
  const [membership] = await db
    .select({
      role: groupMemberships.role,
      groupName: groups.name,
      syncProvider: groups.syncProvider
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.groupId, input.groupId), eq(groupMemberships.userId, input.userId)))
    .limit(1);

  if (!membership) {
    throw new Error("Keine Berechtigung für diese Gruppe");
  }

  if (membership.role !== "owner") {
    throw new Error("Nur Owner dürfen Gruppen löschen oder ausblenden");
  }

  if (isAlleGroupName(membership.groupName)) {
    throw new Error("Die Systemgruppe #alle kann nicht gelöscht werden");
  }

  if (membership.syncProvider) {
    await db
      .update(groups)
      .set({
        isHidden: true
      })
      .where(eq(groups.id, input.groupId));

    return {
      action: "hidden" as const
    };
  }

  await db.delete(groups).where(eq(groups.id, input.groupId));

  return {
    action: "deleted" as const
  };
}

export async function updateGroupHashtags(input: {
  groupId: string;
  userId: string;
  hashtags: string[];
}) {
  const db = getDb();
  const allowed = await isGroupMember(input.groupId, input.userId);
  if (!allowed) {
    throw new Error("Keine Berechtigung für diese Gruppe");
  }

  const [currentGroup] = await db
    .select({ id: groups.id, name: groups.name, syncReference: groups.syncReference })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (!currentGroup) {
    throw new Error("Gruppe nicht gefunden");
  }

  const mustContainAlle = isAlleGroupName(currentGroup.name);
  const mustContainKontakte =
    isKontakteGroupName(currentGroup.name) || currentGroup.syncReference === "contactGroups/myContacts";

  const nextHashtags = normalizeGroupHashtags([
    ...input.hashtags,
    ...(mustContainAlle ? ["#alle"] : []),
    ...(mustContainKontakte ? ["#kontakte"] : [])
  ]);

  const [group] = await db
    .update(groups)
    .set({
      hashtag: serializeGroupHashtags(nextHashtags)
    })
    .where(eq(groups.id, input.groupId))
    .returning();

  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  return {
    ...group,
    hashtags: parseGroupHashtags(group.hashtag)
  };
}

export async function isGroupMember(groupId: string, userId: string) {
  const db = getDb();
  const [membership] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
    .limit(1);

  return Boolean(membership);
}

export async function addMemberToGroupByEmail(input: {
  groupId: string;
  requesterId: string;
  email: string;
}) {
  const db = getDb();
  const allowed = await isGroupMember(input.groupId, input.requesterId);
  if (!allowed) {
    throw new Error("Keine Berechtigung für diese Gruppe");
  }

  const user = await getUserByEmail(normalizeEmail(input.email));
  if (!user) {
    throw new Error("Nutzer nicht gefunden. Er muss sich mindestens einmal mit Google anmelden.");
  }

  await db
    .insert(groupMemberships)
    .values({
      groupId: input.groupId,
      userId: user.id,
      role: "member"
    })
    .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.userId] });

  await db
    .insert(groupContacts)
    .values({
      groupId: input.groupId,
      email: normalizeEmail(input.email),
      name: user.name ?? null,
      source: "manual",
      sourceReference: user.id,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [groupContacts.groupId, groupContacts.email],
      set: {
        name: user.name ?? null,
        source: "manual",
        sourceReference: user.id,
        updatedAt: new Date()
      }
    });

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      syncProvider: groups.syncProvider,
      syncReference: groups.syncReference,
      syncEnabled: groups.syncEnabled
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  return {
    groupId: input.groupId,
    userId: user.id,
    email: normalizeEmail(input.email),
    group: group ?? null
  };
}

export async function addKnownUsersToGroupByEmails(input: {
  groupId: string;
  emails: string[];
}) {
  const db = getDb();
  const normalized = Array.from(new Set(input.emails.map(normalizeEmail).filter(Boolean)));

  if (!normalized.length) {
    return { matchedUsers: 0 };
  }

  const knownUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) in (${sql.join(normalized.map((email) => sql`${email}`), sql`,`)})`);

  if (!knownUsers.length) {
    return { matchedUsers: 0 };
  }

  await db
    .insert(groupMemberships)
    .values(
      knownUsers.map((user) => ({
        groupId: input.groupId,
        userId: user.id,
        role: "member" as const
      }))
    )
    .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.userId] });

  return { matchedUsers: knownUsers.length };
}

export async function replaceGoogleSyncedGroupContacts(input: {
  groupId: string;
  contacts: Array<{ email: string; name?: string | null; image?: string | null; sourceReference?: string | null }>;
}) {
  const db = getDb();
  const normalizedContacts = Array.from(
    new Map(
      input.contacts
        .map((contact) => ({
          email: normalizeEmail(contact.email),
          name: contact.name?.trim() || null,
          image: contact.image?.trim() || null,
          sourceReference: contact.sourceReference ?? null
        }))
        .filter((contact) => Boolean(contact.email))
        .map((contact) => [contact.email, contact])
    ).values()
  );

  await db
    .delete(groupContacts)
    .where(and(eq(groupContacts.groupId, input.groupId), eq(groupContacts.source, "google_contacts")));

  if (!normalizedContacts.length) {
    return { syncedContacts: 0 };
  }

  await db.insert(groupContacts).values(
    normalizedContacts.map((contact) => ({
      groupId: input.groupId,
      email: contact.email,
      name: contact.name,
      image: contact.image,
      source: "google_contacts",
      sourceReference: contact.sourceReference,
      updatedAt: new Date()
    }))
  );

  return { syncedContacts: normalizedContacts.length };
}

export async function listGroupContactsForUser(userId: string) {
  const db = getDb();
  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, userId));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (!groupIds.length) {
    return [] as GroupContact[];
  }

  const [storedContacts, memberContacts] = await Promise.all([
    db
      .select({
        groupId: groupContacts.groupId,
        email: groupContacts.email,
        name: groupContacts.name,
        image: groupContacts.image,
        source: groupContacts.source,
        sourceReference: groupContacts.sourceReference
      })
      .from(groupContacts)
      .where(inArray(groupContacts.groupId, groupIds)),
    db
      .select({
        groupId: groupMemberships.groupId,
        userId: users.id,
        email: users.email,
        name: users.name,
        image: users.image
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(inArray(groupMemberships.groupId, groupIds))
  ]);

  const byKey = new Map<
    string,
    Omit<GroupContact, "emails"> & {
      emails: Set<string>;
    }
  >();
  const keyByGroupEmail = new Map<string, string>();

  for (const contact of storedContacts) {
    const email = normalizeEmail(contact.email);
    const emailKey = `${contact.groupId}:${email}`;
    const key =
      keyByGroupEmail.get(emailKey) ??
      (contact.sourceReference ? `${contact.groupId}:ref:${contact.sourceReference}` : `${contact.groupId}:email:${email}`);
    const existing = byKey.get(key);
    const emails = existing?.emails ?? new Set<string>();
    emails.add(email);

    byKey.set(key, {
      groupId: contact.groupId,
      email: existing?.email ?? email,
      emails,
      name: existing?.name ?? contact.name ?? null,
      image: existing?.image ?? contact.image ?? null,
      isRegistered: existing?.isRegistered ?? false,
      source: existing?.source ?? contact.source
    });
    keyByGroupEmail.set(emailKey, key);
  }

  for (const member of memberContacts) {
    const email = normalizeEmail(member.email);
    const emailKey = `${member.groupId}:${email}`;
    const key = keyByGroupEmail.get(emailKey) ?? `${member.groupId}:member:${member.userId}`;
    const existing = byKey.get(key);
    const emails = existing?.emails ?? new Set<string>();
    emails.add(email);

    byKey.set(key, {
      groupId: member.groupId,
      email: existing?.email ?? email,
      emails,
      name: member.name ?? existing?.name ?? null,
      image: member.image ?? existing?.image ?? null,
      isRegistered: true,
      source: existing?.source ?? "member"
    });
    keyByGroupEmail.set(emailKey, key);
  }

  return Array.from(byKey.values())
    .map((contact) => ({
      ...contact,
      emails: Array.from(contact.emails).sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => {
      if (a.groupId === b.groupId) {
        const aLabel = (a.name ?? a.email).toLowerCase();
        const bLabel = (b.name ?? b.email).toLowerCase();
        const byLabel = aLabel.localeCompare(bLabel);
        if (byLabel !== 0) {
          return byLabel;
        }
        return a.email.localeCompare(b.email);
      }
      return a.groupId.localeCompare(b.groupId);
    });
}

export async function createInviteLink(input: { groupId: string; createdBy: string; expiresInDays?: number }) {
  const db = getDb();
  const token = crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(inviteLinks)
    .values({
      groupId: input.groupId,
      createdBy: input.createdBy,
      token,
      expiresAt
    })
    .returning();

  return invite;
}

export async function joinGroupByToken(input: { token: string; userId: string }) {
  const db = getDb();

  const [invite] = await db
    .select()
    .from(inviteLinks)
    .where(and(eq(inviteLinks.token, input.token), gt(inviteLinks.expiresAt, new Date())))
    .limit(1);

  if (!invite) {
    throw new Error("Ungültiger oder abgelaufener Invite-Link");
  }

  await db
    .insert(groupMemberships)
    .values({
      groupId: invite.groupId,
      userId: input.userId,
      role: "member"
    })
    .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.userId] });

  return invite.groupId;
}

export async function createEvent(input: {
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  visibility: EventVisibility;
  groupId?: string | null;
  tags: string[];
}) {
  const db = getDb();
  const normalizedTags = normalizeTags(input.tags);
  const hasAlleInTitle = titleContainsAlleTag(input.title);
  const hasKontakteInTitle = titleContainsKontakteTag(input.title);
  const hasDateInTitle = titleContainsDateTag(input.title);
  const hasDateTag = hasDateInTitle || normalizedTags.some((tag) => isDateTag(tag));
  const alleGroup = await ensureAlleGroupForUser(input.userId);
  const kontakteGroup = await ensureKontakteGroupForUser(input.userId);
  const targetsAlleGroup = input.groupId === alleGroup.id;
  const targetsKontakteGroup = input.groupId === kontakteGroup.id;
  const isGlobalAlleEvent = hasAlleInTitle || targetsAlleGroup;
  const isKontakteEvent = hasKontakteInTitle || targetsKontakteGroup;
  const finalTags = normalizeTags([
    ...normalizedTags,
    ...(isGlobalAlleEvent ? ["#alle"] : []),
    ...(isKontakteEvent ? ["#kontakte"] : []),
    ...(hasDateTag ? [DATE_TAG] : [])
  ]);

  if (hasDateTag) {
    const dateStatus = await getDateHashtagStatus(input.userId);
    if (!dateStatus.unlocked) {
      const requirementLabels: Record<DateMissingRequirement, string> = {
        enable_mode: "Dating-Modus aktivieren",
        birth_year: "Geburtsjahr ausfüllen",
        adult: "mindestens 18 Jahre alt sein",
        gender: "dein Geschlecht auswählen",
        must_be_single: "Single-Status auf 'single' setzen",
        sought_genders: "gesuchte Geschlechter auswählen",
        sought_age_range: "gesuchten Altersbereich vollständig setzen"
      };
      const missing = dateStatus.missingRequirements.map((item) => requirementLabels[item]).join(", ");
      throw new RepositoryValidationError(
        `#date ist noch nicht freigeschaltet. Bitte zuerst dein Dating-Profil vervollständigen: ${missing}.`
      );
    }

    if (finalTags.includes("#alle") || finalTags.includes("#kontakte") || isGlobalAlleEvent || isKontakteEvent) {
      throw new RepositoryValidationError("#date kann nicht mit #alle oder #kontakte kombiniert werden.");
    }
  }

  const finalVisibility: EventVisibility = hasDateTag
    ? "smart_date"
    : isGlobalAlleEvent
      ? "public"
      : targetsKontakteGroup
        ? "group"
        : input.visibility;
  const finalGroupId = hasDateTag ? null : hasAlleInTitle ? alleGroup?.id ?? null : input.groupId ?? null;

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        visibility: finalVisibility,
        groupId: finalGroupId,
        createdBy: input.userId
      })
      .returning();

    if (finalTags.length) {
      await tx.insert(eventTags).values(
        finalTags.map((tag) => ({
          eventId: event.id,
          tag
        }))
      );
    }

    return event;
  });
}

export async function upsertExternalPublicEvent(input: {
  userId: string;
  sourceProvider: string;
  sourceEventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  groupId?: string | null;
  tags: string[];
}) {
  const db = getDb();
  const normalizedTags = normalizeTags([...input.tags, "#alle"]);

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        visibility: "public",
        groupId: input.groupId ?? null,
        sourceProvider: input.sourceProvider,
        sourceEventId: input.sourceEventId,
        createdBy: input.userId
      })
      .onConflictDoUpdate({
        target: [events.sourceProvider, events.sourceEventId],
        set: {
          title: input.title,
          description: input.description ?? null,
          location: input.location ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          visibility: "public",
          groupId: input.groupId ?? null
        }
      })
      .returning();

    await tx.delete(eventTags).where(eq(eventTags.eventId, event.id));

    if (normalizedTags.length) {
      await tx.insert(eventTags).values(
        normalizedTags.map((tag) => ({
          eventId: event.id,
          tag
        }))
      );
    }

    return event;
  });
}

export async function listExternalSourceEventsForUser(input: {
  userId: string;
  sourceProvider: string;
}) {
  const db = getDb();
  return db
    .select({
      id: events.id,
      sourceEventId: events.sourceEventId
    })
    .from(events)
    .where(and(eq(events.createdBy, input.userId), eq(events.sourceProvider, input.sourceProvider)));
}

export async function listSuggestionCalendarRefsByEventIds(eventIds: string[]) {
  if (!eventIds.length) {
    return [] as Array<{ id: string; userId: string; calendarEventId: string | null }>;
  }

  const db = getDb();
  return db
    .select({
      id: suggestions.id,
      userId: suggestions.userId,
      calendarEventId: suggestions.calendarEventId
    })
    .from(suggestions)
    .where(inArray(suggestions.eventId, eventIds));
}

export async function deleteEventsByIds(eventIds: string[]) {
  if (!eventIds.length) {
    return 0;
  }

  const db = getDb();
  await db.delete(events).where(inArray(events.id, eventIds));
  return eventIds.length;
}

export async function listVisibleEventsForUser(userId: string) {
  const db = getDb();
  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, userId));

  const groupIds = memberships.map((membership) => membership.groupId);
  const filters = [
    eq(events.visibility, "public" as EventVisibility),
    eq(events.visibility, "smart_date" as EventVisibility),
    eq(events.createdBy, userId)
  ];

  if (groupIds.length > 0) {
    filters.push(inArray(events.groupId, groupIds));
  }

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      visibility: events.visibility,
      groupId: events.groupId,
      createdBy: events.createdBy,
      groupName: groups.name,
      sourceProvider: events.sourceProvider,
      sourceEventId: events.sourceEventId
    })
    .from(events)
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(and(or(...filters), gt(events.endsAt, new Date())))
    .orderBy(events.startsAt);

  if (!rows.length) {
    return [] as VisibleEvent[];
  }

  const tags = await db
    .select({ eventId: eventTags.eventId, tag: eventTags.tag })
    .from(eventTags)
    .where(inArray(eventTags.eventId, rows.map((row) => row.id)));

  const tagsMap = new Map<string, string[]>();
  for (const tag of tags) {
    const current = tagsMap.get(tag.eventId) ?? [];
    current.push(tag.tag);
    tagsMap.set(tag.eventId, current);
  }

  const mapped = rows.map((row) => ({
    ...row,
    tags: normalizeTags(tagsMap.get(row.id) ?? [])
  }));

  const smartDateCreatorIds = Array.from(
    new Set(
      mapped
        .filter((event) => event.visibility === "smart_date" && event.createdBy !== userId)
        .map((event) => event.createdBy)
    )
  );

  if (!smartDateCreatorIds.length) {
    return mapped;
  }

  const profiles = await getDatingProfileMapForUsers([userId, ...smartDateCreatorIds]);
  const viewerProfile = profiles.get(userId) ?? createDefaultDatingProfile(userId);

  return mapped.filter((event) => {
    if (event.visibility !== "smart_date") {
      return true;
    }

    if (event.createdBy === userId) {
      return true;
    }

    const creatorProfile = profiles.get(event.createdBy) ?? createDefaultDatingProfile(event.createdBy);
    return isDatingMutualMatch(viewerProfile, creatorProfile);
  });
}

export async function getPublicEventSharePreviewById(eventId: string): Promise<PublicEventSharePreview | null> {
  const db = getDb();
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      createdByName: users.name,
      createdByEmail: users.email
    })
    .from(events)
    .innerJoin(users, eq(events.createdBy, users.id))
    .where(and(eq(events.id, eventId), eq(events.visibility, "public" as EventVisibility)))
    .limit(1);

  if (!event) {
    return null;
  }

  return event;
}

export async function getVisibleEventForUserById(input: { userId: string; eventId: string }) {
  const db = getDb();
  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, input.userId));

  const groupIds = memberships.map((membership) => membership.groupId);
  const visibilityFilters = [
    eq(events.visibility, "public" as EventVisibility),
    eq(events.visibility, "smart_date" as EventVisibility),
    eq(events.createdBy, input.userId)
  ];

  if (groupIds.length > 0) {
    visibilityFilters.push(inArray(events.groupId, groupIds));
  }

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      visibility: events.visibility,
      groupId: events.groupId,
      groupName: groups.name,
      createdBy: events.createdBy,
      createdByName: users.name,
      createdByEmail: users.email,
      sourceProvider: events.sourceProvider,
      sourceEventId: events.sourceEventId
    })
    .from(events)
    .leftJoin(groups, eq(events.groupId, groups.id))
    .innerJoin(users, eq(events.createdBy, users.id))
    .where(and(eq(events.id, input.eventId), or(...visibilityFilters)))
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  const tags = await db
    .select({ tag: eventTags.tag })
    .from(eventTags)
    .where(eq(eventTags.eventId, input.eventId));

  const event = {
    ...rows[0],
    tags: normalizeTags(tags.map((entry) => entry.tag))
  };

  if (event.visibility === "smart_date" && event.createdBy !== input.userId) {
    const profiles = await getDatingProfileMapForUsers([input.userId, event.createdBy]);
    const viewerProfile = profiles.get(input.userId) ?? createDefaultDatingProfile(input.userId);
    const creatorProfile = profiles.get(event.createdBy) ?? createDefaultDatingProfile(event.createdBy);

    if (!isDatingMutualMatch(viewerProfile, creatorProfile)) {
      return null;
    }
  }

  return event;
}

export async function getSuggestionForEventForUser(input: { userId: string; eventId: string }) {
  const db = getDb();
  const [row] = await db
    .select({
      id: suggestions.id,
      status: suggestions.status,
      decisionReasons: suggestions.decisionReasons,
      decisionNote: suggestions.decisionNote,
      score: suggestions.score,
      reason: suggestions.reason
    })
    .from(suggestions)
    .where(and(eq(suggestions.userId, input.userId), eq(suggestions.eventId, input.eventId)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    reason: normalizeSuggestionReason(row.reason),
    decisionReasons: parseDecisionReasons(row.decisionReasons)
  };
}

export async function listPublicAlleEvents(limit = 20) {
  const db = getDb();
  const alleEvents = await db
    .select({ eventId: eventTags.eventId })
    .from(eventTags)
    .where(eq(eventTags.tag, "#alle"));

  if (!alleEvents.length) {
    return [] as VisibleEvent[];
  }

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      visibility: events.visibility,
      groupId: events.groupId,
      createdBy: events.createdBy,
      groupName: groups.name,
      sourceProvider: events.sourceProvider,
      sourceEventId: events.sourceEventId
    })
    .from(events)
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(
      and(
        eq(events.visibility, "public"),
        inArray(
          events.id,
          alleEvents.map((item) => item.eventId)
        ),
        gt(events.endsAt, new Date())
      )
    )
    .orderBy(events.startsAt)
    .limit(limit);

  if (!rows.length) {
    return [] as VisibleEvent[];
  }

  const tags = await db
    .select({ eventId: eventTags.eventId, tag: eventTags.tag })
    .from(eventTags)
    .where(inArray(eventTags.eventId, rows.map((row) => row.id)));

  const tagsMap = new Map<string, string[]>();
  for (const tag of tags) {
    const current = tagsMap.get(tag.eventId) ?? [];
    current.push(tag.tag);
    tagsMap.set(tag.eventId, current);
  }

  return rows.map((row) => ({
    ...row,
    tags: normalizeTags(tagsMap.get(row.id) ?? [])
  }));
}

async function listPublicAlleEventsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      visibility: events.visibility,
      groupId: events.groupId,
      createdBy: events.createdBy,
      groupName: groups.name,
      sourceProvider: events.sourceProvider,
      sourceEventId: events.sourceEventId
    })
    .from(events)
    .leftJoin(groups, eq(events.groupId, groups.id))
    .innerJoin(
      eventTags,
      and(eq(eventTags.eventId, events.id), or(eq(eventTags.tag, "#alle"), eq(eventTags.tag, "#all")))
    )
    .where(and(eq(events.createdBy, userId), eq(events.visibility, "public"), gt(events.endsAt, new Date())))
    .orderBy(events.startsAt);

  if (!rows.length) {
    return [] as VisibleEvent[];
  }

  const tags = await db
    .select({ eventId: eventTags.eventId, tag: eventTags.tag })
    .from(eventTags)
    .where(inArray(eventTags.eventId, rows.map((row) => row.id)));

  const tagsMap = new Map<string, string[]>();
  for (const tag of tags) {
    const current = tagsMap.get(tag.eventId) ?? [];
    current.push(tag.tag);
    tagsMap.set(tag.eventId, current);
  }

  return rows.map((row) => ({
    ...row,
    tags: normalizeTags(tagsMap.get(row.id) ?? [])
  }));
}

function mapVisibleEventToUserProfileEvent(event: VisibleEvent, matchStatus: SuggestionStatus | null): UserProfileEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    visibility: event.visibility,
    groupName: event.groupName,
    tags: event.tags,
    matchStatus
  };
}

export async function getUserProfileOverview(input: {
  profileUserId: string;
  viewerUserId?: string | null;
}): Promise<UserProfileOverview | null> {
  const user = await getUserById(input.profileUserId);
  if (!user) {
    return null;
  }

  if (!input.viewerUserId) {
    const events = await listPublicAlleEventsForUser(input.profileUserId);
    return {
      profile: {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt
      },
      visibility: "public_alle",
      events: events.map((event) => mapVisibleEventToUserProfileEvent(event, null))
    };
  }

  const visibleEvents = (await listVisibleEventsForUser(input.viewerUserId)).filter(
    (event) => event.createdBy === input.profileUserId
  );

  if (input.viewerUserId === input.profileUserId) {
    return {
      profile: {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt
      },
      visibility: "owner",
      events: visibleEvents.map((event) => mapVisibleEventToUserProfileEvent(event, null))
    };
  }

  const suggestionStates = await listSuggestionStatesForUser(input.viewerUserId);
  const statusByEventId = new Map(suggestionStates.map((entry) => [entry.eventId, entry.status]));
  const matchedEvents = [] as UserProfileEvent[];

  for (const event of visibleEvents) {
    const status = statusByEventId.get(event.id);
    if (!status) {
      continue;
    }

    matchedEvents.push(mapVisibleEventToUserProfileEvent(event, status));
  }

  return {
    profile: {
      id: user.id,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt
    },
    visibility: "matched",
    events: matchedEvents
  };
}

export async function listSuggestionStatesForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: suggestions.id,
      eventId: suggestions.eventId,
      status: suggestions.status,
      calendarEventId: suggestions.calendarEventId
    })
    .from(suggestions)
    .where(eq(suggestions.userId, userId));

  return rows;
}

export async function listSuggestionCalendarRefsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      calendarEventId: suggestions.calendarEventId
    })
    .from(suggestions)
    .where(eq(suggestions.userId, userId));

  return rows
    .map((row) => row.calendarEventId?.trim() ?? "")
    .filter((calendarEventId): calendarEventId is string => Boolean(calendarEventId));
}

export async function getAutoInsertedSuggestionCountForUser(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(suggestions)
    .where(and(eq(suggestions.userId, userId), eq(suggestions.status, "calendar_inserted")));

  return Number(row?.count ?? 0);
}

export async function removeSuggestionsForUserByEventIds(input: {
  userId: string;
  eventIds: string[];
}) {
  if (!input.eventIds.length) {
    return 0;
  }

  const db = getDb();
  await db
    .delete(suggestions)
    .where(and(eq(suggestions.userId, input.userId), inArray(suggestions.eventId, input.eventIds)));

  return input.eventIds.length;
}

export async function upsertSuggestion(input: {
  userId: string;
  eventId: string;
  score: number;
  reason: string;
  status?: SuggestionStatus;
}) {
  const db = getDb();
  const reason = normalizeSuggestionReason(input.reason);

  const [row] = await db
    .insert(suggestions)
    .values({
      userId: input.userId,
      eventId: input.eventId,
      score: input.score,
      reason,
      status: input.status ?? "pending",
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [suggestions.userId, suggestions.eventId],
      set: {
        score: input.score,
        reason,
        status: input.status ?? "pending",
        updatedAt: new Date()
      }
    })
    .returning();

  return row;
}

export async function markSuggestionInserted(suggestionId: string, calendarEventId: string) {
  const db = getDb();
  const [row] = await db
    .update(suggestions)
    .set({
      status: "calendar_inserted",
      calendarEventId,
      updatedAt: new Date()
    })
    .where(eq(suggestions.id, suggestionId))
    .returning();

  return row;
}

export async function setSuggestionCalendarEventRef(input: { suggestionId: string; calendarEventId: string }) {
  const db = getDb();
  const [row] = await db
    .update(suggestions)
    .set({
      calendarEventId: input.calendarEventId,
      updatedAt: new Date()
    })
    .where(eq(suggestions.id, input.suggestionId))
    .returning();

  return row ?? null;
}

export async function clearSuggestionCalendarEventRef(suggestionId: string) {
  const db = getDb();
  const [row] = await db
    .update(suggestions)
    .set({
      calendarEventId: null,
      updatedAt: new Date()
    })
    .where(eq(suggestions.id, suggestionId))
    .returning();

  return row ?? null;
}

export async function getSuggestionForUser(suggestionId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: suggestions.id,
      status: suggestions.status,
      eventId: suggestions.eventId,
      score: suggestions.score,
      reason: suggestions.reason,
      calendarEventId: suggestions.calendarEventId,
      decisionReasons: suggestions.decisionReasons,
      decisionNote: suggestions.decisionNote,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      location: events.location,
      createdBy: events.createdBy,
      createdByName: users.name,
      createdByEmail: users.email
    })
    .from(suggestions)
    .innerJoin(events, eq(suggestions.eventId, events.id))
    .innerJoin(users, eq(events.createdBy, users.id))
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.userId, userId)))
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  const tagRows = await db
    .select({ tag: eventTags.tag })
    .from(eventTags)
    .where(eq(eventTags.eventId, rows[0].eventId));

  return {
    ...rows[0],
    reason: normalizeSuggestionReason(rows[0].reason),
    decisionReasons: parseDecisionReasons(rows[0].decisionReasons),
    tags: normalizeTags(tagRows.map((row) => row.tag))
  };
}

export async function listSuggestionsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: suggestions.id,
      eventId: suggestions.eventId,
      status: suggestions.status,
      score: suggestions.score,
      reason: suggestions.reason,
      calendarEventId: suggestions.calendarEventId,
      decisionReasons: suggestions.decisionReasons,
      decisionNote: suggestions.decisionNote,
      createdAt: suggestions.createdAt,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      createdBy: events.createdBy,
      createdByName: users.name,
      createdByEmail: users.email
    })
    .from(suggestions)
    .innerJoin(events, eq(suggestions.eventId, events.id))
    .innerJoin(users, eq(events.createdBy, users.id))
    .where(eq(suggestions.userId, userId))
    .orderBy(desc(suggestions.createdAt));

  if (!rows.length) {
    return [];
  }

  const tags = await db
    .select({ eventId: eventTags.eventId, tag: eventTags.tag })
    .from(eventTags)
    .where(inArray(eventTags.eventId, rows.map((row) => row.eventId)));

  const tagsMap = new Map<string, string[]>();
  for (const tag of tags) {
    const current = tagsMap.get(tag.eventId) ?? [];
    current.push(tag.tag);
    tagsMap.set(tag.eventId, current);
  }

  return rows.map((row) => ({
    ...row,
    reason: normalizeSuggestionReason(row.reason),
    decisionReasons: parseDecisionReasons(row.decisionReasons),
    tags: normalizeTags(tagsMap.get(row.eventId) ?? [])
  }));
}

export async function getTagPreferenceMap(userId: string) {
  const db = getDb();
  const rows = await db.select().from(tagPreferences).where(eq(tagPreferences.userId, userId));
  const map = new Map<string, { weight: number; votes: number }>();

  for (const row of rows) {
    map.set(row.tag, { weight: row.weight, votes: row.votes });
  }

  return map;
}

function getTimeslotLabel(weekday: number, hour: number) {
  const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const weekdayLabel = weekdays[weekday] ?? `Tag ${weekday}`;
  return `${weekdayLabel} ${String(hour).padStart(2, "0")}:00`;
}

function getPersonLabel(userId: string, userLabels: Map<string, string>) {
  return userLabels.get(userId) ?? `Person ${userId.slice(0, 8)}`;
}

function getPreferenceCriterionLabel(tag: string, userLabels: Map<string, string>) {
  if (tag.startsWith("person:")) {
    const userId = tag.slice("person:".length);
    return {
      key: tag,
      label: `Person: ${getPersonLabel(userId, userLabels)}`
    };
  }

  if (tag.startsWith("timeslot:")) {
    const [weekdayRaw, hourRaw] = tag.slice("timeslot:".length).split(":");
    const weekday = Number.parseInt(weekdayRaw ?? "", 10);
    const hour = Number.parseInt(hourRaw ?? "", 10);

    if (Number.isInteger(weekday) && Number.isInteger(hour)) {
      return {
        key: tag,
        label: `Zeitfenster: ${getTimeslotLabel(weekday, hour)}`
      };
    }
  }

  if (tag.startsWith("location:")) {
    const location = tag.slice("location:".length).replace(/-/g, " ");
    return {
      key: tag,
      label: `Ort: ${location || "Unbekannt"}`
    };
  }

  if (tag.startsWith("#")) {
    return {
      key: tag,
      label: `Aktivität: ${tag}`
    };
  }

  return {
    key: tag,
    label: `Signal: ${tag}`
  };
}

export async function getSuggestionLearningSummary(userId: string): Promise<SuggestionLearningSummary> {
  const db = getDb();
  const [settings, preferenceRows] = await Promise.all([
    getUserSuggestionSettings(userId),
    db
      .select({
        tag: tagPreferences.tag,
        weight: tagPreferences.weight,
        votes: tagPreferences.votes
      })
      .from(tagPreferences)
      .where(eq(tagPreferences.userId, userId))
  ]);

  const personIds = normalizeStringList([
    ...settings.blockedCreatorIds,
    ...preferenceRows
      .filter((row) => row.tag.startsWith("person:"))
      .map((row) => row.tag.slice("person:".length))
  ]);
  const personRows = personIds.length
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(inArray(users.id, personIds))
    : [];
  const personLabelMap = new Map<string, string>();
  for (const person of personRows) {
    personLabelMap.set(person.id, person.name?.trim() || person.email);
  }

  const normalizedCriteria = preferenceRows.map((row) => {
    const criterion = getPreferenceCriterionLabel(row.tag, personLabelMap);
    return {
      key: criterion.key,
      label: criterion.label,
      weight: Number(row.weight.toFixed(2)),
      votes: row.votes
    };
  });

  const positiveCriteria = normalizedCriteria
    .filter((criterion) => criterion.weight > 0.15)
    .sort((a, b) => b.weight - a.weight || b.votes - a.votes)
    .slice(0, 6);
  const negativeCriteria = normalizedCriteria
    .filter((criterion) => criterion.weight < -0.15)
    .sort((a, b) => a.weight - b.weight || b.votes - a.votes)
    .slice(0, 6);

  return {
    positiveCriteria,
    negativeCriteria,
    blockedPeople: settings.blockedCreatorIds.map((id) => ({
      id,
      label: getPersonLabel(id, personLabelMap)
    })),
    blockedActivityTags: settings.blockedActivityTags
  };
}

export async function applyDecisionFeedback(input: {
  userId: string;
  suggestionId: string;
  decision: "accepted" | "declined";
  reasons?: DeclineReason[];
  note?: string | null;
}) {
  const db = getDb();
  const suggestion = await getSuggestionForUser(input.suggestionId, input.userId);

  if (!suggestion) {
    throw new Error("Suggestion nicht gefunden");
  }

  const reasons = input.decision === "declined" ? normalizeDecisionReasons(input.reasons) : [];
  const note = input.decision === "declined" ? normalizeDecisionNote(input.note) : null;

  await db.transaction(async (tx) => {
    await tx
      .update(suggestions)
      .set({
        status: input.decision,
        decisionReasons: serializeDecisionReasons(reasons),
        decisionNote: note,
        updatedAt: new Date()
      })
      .where(and(eq(suggestions.id, input.suggestionId), eq(suggestions.userId, input.userId)));

    const isConditionalDecline = input.decision === "declined" && reasons.length === 1 && reasons[0] === "would_if_changed";
    const delta = input.decision === "accepted" ? 1.1 : isConditionalDecline ? -0.1 : -0.5;

    for (const tag of suggestion.tags) {
      await tx
        .insert(tagPreferences)
        .values({
          userId: input.userId,
          tag,
          weight: delta,
          votes: 1,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [tagPreferences.userId, tagPreferences.tag],
          set: {
            weight: sql`${tagPreferences.weight} + ${delta}`,
            votes: sql`${tagPreferences.votes} + 1`,
            updatedAt: new Date()
          }
        });
    }

    if (input.decision === "accepted") {
      const contextTags = [
        createPersonPreferenceTag(suggestion.createdBy),
        createTimeslotPreferenceTag(suggestion.startsAt)
      ] as string[];
      const locationTag = createLocationPreferenceTag(suggestion.location);
      if (locationTag) {
        contextTags.push(locationTag);
      }

      for (const contextTag of contextTags) {
        await tx
          .insert(tagPreferences)
          .values({
            userId: input.userId,
            tag: contextTag,
            weight: 0.45,
            votes: 1,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [tagPreferences.userId, tagPreferences.tag],
            set: {
              weight: sql`${tagPreferences.weight} + ${0.45}`,
              votes: sql`${tagPreferences.votes} + 1`,
              updatedAt: new Date()
            }
          });
      }

      return;
    }

    const locationTag = createLocationPreferenceTag(suggestion.location);

    if (reasons.includes("not_with_this_person")) {
      await tx
        .insert(tagPreferences)
        .values({
          userId: input.userId,
          tag: createPersonPreferenceTag(suggestion.createdBy),
          weight: -1.2,
          votes: 1,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [tagPreferences.userId, tagPreferences.tag],
          set: {
            weight: sql`${tagPreferences.weight} + ${-1.2}`,
            votes: sql`${tagPreferences.votes} + 1`,
            updatedAt: new Date()
          }
        });
    }

    if (reasons.includes("not_this_activity")) {
      for (const tag of suggestion.tags) {
        await tx
          .insert(tagPreferences)
          .values({
            userId: input.userId,
            tag,
            weight: -1,
            votes: 1,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [tagPreferences.userId, tagPreferences.tag],
            set: {
              weight: sql`${tagPreferences.weight} + ${-1}`,
              votes: sql`${tagPreferences.votes} + 1`,
              updatedAt: new Date()
            }
          });
      }
    }

    if (reasons.includes("no_time")) {
      await tx
        .insert(tagPreferences)
        .values({
          userId: input.userId,
          tag: createTimeslotPreferenceTag(suggestion.startsAt),
          weight: -0.9,
          votes: 1,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [tagPreferences.userId, tagPreferences.tag],
          set: {
            weight: sql`${tagPreferences.weight} + ${-0.9}`,
            votes: sql`${tagPreferences.votes} + 1`,
            updatedAt: new Date()
          }
        });
    }

    if (locationTag && reasons.includes("too_far")) {
      await tx
        .insert(tagPreferences)
        .values({
          userId: input.userId,
          tag: locationTag,
          weight: -1,
          votes: 1,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [tagPreferences.userId, tagPreferences.tag],
          set: {
            weight: sql`${tagPreferences.weight} + ${-1}`,
            votes: sql`${tagPreferences.votes} + 1`,
            updatedAt: new Date()
          }
        });
    }

    if (reasons.includes("not_with_this_person") || reasons.includes("not_this_activity")) {
      const [settings] = await tx
        .select({
          blockedCreatorIds: userSettings.blockedCreatorIds,
          blockedActivityTags: userSettings.blockedActivityTags
        })
        .from(userSettings)
        .where(eq(userSettings.userId, input.userId))
        .limit(1);

      const blockedCreatorIds = parseStringList(settings?.blockedCreatorIds);
      const blockedActivityTags = parseBlockedActivityTags(settings?.blockedActivityTags);
      const nextBlockedCreatorIds = reasons.includes("not_with_this_person")
        ? normalizeStringList([...blockedCreatorIds, suggestion.createdBy])
        : blockedCreatorIds;
      const nextBlockedActivityTags = reasons.includes("not_this_activity")
        ? normalizeBlockedActivityTags([...blockedActivityTags, ...suggestion.tags])
        : blockedActivityTags;

      await tx
        .insert(userSettings)
        .values({
          userId: input.userId,
          autoInsertSuggestions: true,
          suggestionCalendarId: "primary",
          suggestionDeliveryMode: "calendar_copy",
          shareEmailInSourceInvites: true,
          matchingCalendarIds: "",
          blockedCreatorIds: serializeStringList(nextBlockedCreatorIds),
          blockedActivityTags: serializeBlockedActivityTags(nextBlockedActivityTags),
          suggestionLimitPerDay: 4,
          suggestionLimitPerWeek: 16,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [userSettings.userId],
          set: {
            blockedCreatorIds: serializeStringList(nextBlockedCreatorIds),
            blockedActivityTags: serializeBlockedActivityTags(nextBlockedActivityTags),
            updatedAt: new Date()
          }
        });
    }
  });

  return suggestion;
}
