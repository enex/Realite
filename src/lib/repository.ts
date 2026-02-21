import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  calendarConnections,
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

export type GroupVisibility = "public" | "private";
export type EventVisibility = "public" | "group";
export type SuggestionStatus = "pending" | "calendar_inserted" | "accepted" | "declined";

export type UserSuggestionSettings = {
  autoInsertSuggestions: boolean;
  suggestionCalendarId: string;
  suggestionDeliveryMode: "calendar_copy" | "source_invite";
  shareEmailInSourceInvites: boolean;
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

export type GroupContact = {
  groupId: string;
  email: string;
  name: string | null;
  isRegistered: boolean;
  source: string;
};

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    )
  );
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
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: [userSettings.userId] });
}

export async function getUserSuggestionSettings(userId: string): Promise<UserSuggestionSettings> {
  const db = getDb();
  await ensureUserSuggestionSettings(userId);

  const [settings] = await db
    .select({
      autoInsertSuggestions: userSettings.autoInsertSuggestions,
      suggestionCalendarId: userSettings.suggestionCalendarId,
      suggestionDeliveryMode: userSettings.suggestionDeliveryMode,
      shareEmailInSourceInvites: userSettings.shareEmailInSourceInvites
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return (
    settings
      ? {
          ...settings,
          suggestionDeliveryMode: normalizeSuggestionDeliveryMode(settings.suggestionDeliveryMode)
        }
      : {
      autoInsertSuggestions: true,
      suggestionCalendarId: "primary",
      suggestionDeliveryMode: "calendar_copy",
      shareEmailInSourceInvites: true
        }
  );
}

export async function updateUserSuggestionSettings(input: {
  userId: string;
  autoInsertSuggestions: boolean;
  suggestionCalendarId: string;
  suggestionDeliveryMode: "calendar_copy" | "source_invite";
  shareEmailInSourceInvites: boolean;
}): Promise<UserSuggestionSettings> {
  const db = getDb();

  const [settings] = await db
    .insert(userSettings)
    .values({
      userId: input.userId,
      autoInsertSuggestions: input.autoInsertSuggestions,
      suggestionCalendarId: input.suggestionCalendarId,
      suggestionDeliveryMode: input.suggestionDeliveryMode,
      shareEmailInSourceInvites: input.shareEmailInSourceInvites,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [userSettings.userId],
      set: {
        autoInsertSuggestions: input.autoInsertSuggestions,
        suggestionCalendarId: input.suggestionCalendarId,
        suggestionDeliveryMode: input.suggestionDeliveryMode,
        shareEmailInSourceInvites: input.shareEmailInSourceInvites,
        updatedAt: new Date()
      }
    })
    .returning({
      autoInsertSuggestions: userSettings.autoInsertSuggestions,
      suggestionCalendarId: userSettings.suggestionCalendarId,
      suggestionDeliveryMode: userSettings.suggestionDeliveryMode,
      shareEmailInSourceInvites: userSettings.shareEmailInSourceInvites
    });

  return {
    autoInsertSuggestions: settings?.autoInsertSuggestions ?? input.autoInsertSuggestions,
    suggestionCalendarId: settings?.suggestionCalendarId ?? input.suggestionCalendarId,
    suggestionDeliveryMode: normalizeSuggestionDeliveryMode(settings?.suggestionDeliveryMode ?? input.suggestionDeliveryMode),
    shareEmailInSourceInvites: settings?.shareEmailInSourceInvites ?? input.shareEmailInSourceInvites
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
  contacts: Array<{ email: string; name?: string | null; sourceReference?: string | null }>;
}) {
  const db = getDb();
  const normalizedContacts = Array.from(
    new Map(
      input.contacts
        .map((contact) => ({
          email: normalizeEmail(contact.email),
          name: contact.name?.trim() || null,
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
        source: groupContacts.source
      })
      .from(groupContacts)
      .where(inArray(groupContacts.groupId, groupIds)),
    db
      .select({
        groupId: groupMemberships.groupId,
        email: users.email,
        name: users.name
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(inArray(groupMemberships.groupId, groupIds))
  ]);

  const byKey = new Map<string, GroupContact>();

  for (const contact of storedContacts) {
    const email = normalizeEmail(contact.email);
    const key = `${contact.groupId}:${email}`;
    byKey.set(key, {
      groupId: contact.groupId,
      email,
      name: contact.name ?? null,
      isRegistered: false,
      source: contact.source
    });
  }

  for (const member of memberContacts) {
    const email = normalizeEmail(member.email);
    const key = `${member.groupId}:${email}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      groupId: member.groupId,
      email,
      name: member.name ?? existing?.name ?? null,
      isRegistered: true,
      source: existing?.source ?? "member"
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.groupId === b.groupId) {
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
  const alleGroup = await ensureAlleGroupForUser(input.userId);
  const kontakteGroup = await ensureKontakteGroupForUser(input.userId);
  const targetsAlleGroup = input.groupId === alleGroup.id;
  const targetsKontakteGroup = input.groupId === kontakteGroup.id;
  const isGlobalAlleEvent = hasAlleInTitle || targetsAlleGroup;
  const finalTags = normalizeTags([
    ...normalizedTags,
    ...(isGlobalAlleEvent ? ["#alle"] : []),
    ...(targetsKontakteGroup ? ["#kontakte"] : [])
  ]);

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        visibility: isGlobalAlleEvent ? "public" : targetsKontakteGroup ? "group" : input.visibility,
        groupId: hasAlleInTitle ? alleGroup?.id ?? null : input.groupId ?? null,
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
  const filters = [eq(events.visibility, "public" as EventVisibility), eq(events.createdBy, userId)];

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

  return rows.map((row) => ({
    ...row,
    tags: tagsMap.get(row.id) ?? []
  }));
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
    tags: tagsMap.get(row.id) ?? []
  }));
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

  const [row] = await db
    .insert(suggestions)
    .values({
      userId: input.userId,
      eventId: input.eventId,
      score: input.score,
      reason: input.reason,
      status: input.status ?? "pending",
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [suggestions.userId, suggestions.eventId],
      set: {
        score: input.score,
        reason: input.reason,
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
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      location: events.location
    })
    .from(suggestions)
    .innerJoin(events, eq(suggestions.eventId, events.id))
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
    tags: tagRows.map((row) => row.tag)
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
      createdAt: suggestions.createdAt,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
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
    tags: tagsMap.get(row.eventId) ?? []
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

export async function applyDecisionFeedback(input: {
  userId: string;
  suggestionId: string;
  decision: "accepted" | "declined";
}) {
  const db = getDb();
  const suggestion = await getSuggestionForUser(input.suggestionId, input.userId);

  if (!suggestion) {
    throw new Error("Suggestion nicht gefunden");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(suggestions)
      .set({
        status: input.decision,
        updatedAt: new Date()
      })
      .where(and(eq(suggestions.id, input.suggestionId), eq(suggestions.userId, input.userId)));

    const delta = input.decision === "accepted" ? 1 : -0.5;

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
  });

  return suggestion;
}
