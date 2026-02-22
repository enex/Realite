import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const groupVisibilityEnum = pgEnum("group_visibility", [
  "public",
  "private",
]);
export const groupRoleEnum = pgEnum("group_role", ["owner", "member"]);
export const eventVisibilityEnum = pgEnum("event_visibility", [
  "public",
  "group",
  "smart_date",
]);
export const datingGenderEnum = pgEnum("dating_gender", ["woman", "man", "non_binary"]);
export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "calendar_inserted",
  "accepted",
  "declined",
]);
export const smartMeetingPlanStatusEnum = pgEnum("smart_meeting_plan_status", [
  "active",
  "secured",
  "exhausted",
  "paused",
]);
export const smartMeetingRunStatusEnum = pgEnum("smart_meeting_run_status", [
  "pending",
  "secured",
  "expired",
  "cancelled",
]);
export const smartMeetingResponseEnum = pgEnum("smart_meeting_response", [
  "accepted",
  "declined",
  "no_response",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex().on(table.email)],
);

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.provider] }),
    index().on(table.provider),
  ],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),
  autoInsertSuggestions: boolean("auto_insert_suggestions").notNull().default(true),
  suggestionCalendarId: text("suggestion_calendar_id").notNull().default("primary"),
  suggestionDeliveryMode: text("suggestion_delivery_mode").notNull().default("calendar_copy"),
  shareEmailInSourceInvites: boolean("share_email_in_source_invites").notNull().default(true),
  matchingCalendarIds: text("matching_calendar_ids").notNull().default(""),
  blockedCreatorIds: text("blocked_creator_ids").notNull().default(""),
  blockedActivityTags: text("blocked_activity_tags").notNull().default(""),
  suggestionLimitPerDay: integer("suggestion_limit_per_day").notNull().default(4),
  suggestionLimitPerWeek: integer("suggestion_limit_per_week").notNull().default(16),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const datingProfiles = pgTable(
  "dating_profiles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    birthYear: integer("birth_year"),
    gender: datingGenderEnum("gender"),
    isSingle: boolean("is_single").notNull().default(false),
    soughtGenders: text("sought_genders").notNull().default(""),
    soughtAgeMin: integer("sought_age_min"),
    soughtAgeMax: integer("sought_age_max"),
    soughtOnlySingles: boolean("sought_only_singles").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index().on(table.gender), index().on(table.enabled)],
);

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  hashtag: text("hashtag").notNull().default("#alle"),
  visibility: groupVisibilityEnum("visibility").notNull().default("private"),
  syncProvider: text("sync_provider"),
  syncReference: text("sync_reference"),
  syncEnabled: boolean("sync_enabled").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  uniqueIndex().on(table.syncProvider, table.syncReference, table.createdBy)
]);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex().on(table.groupId, table.userId)],
);

export const groupContacts = pgTable(
  "group_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    source: text("source").notNull().default("manual"),
    sourceReference: text("source_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex().on(table.groupId, table.email),
    index().on(table.groupId, table.source),
  ],
);

export const inviteLinks = pgTable(
  "invite_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex().on(table.token)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    visibility: eventVisibilityEnum("visibility").notNull().default("public"),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    sourceProvider: text("source_provider"),
    sourceEventId: text("source_event_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().on(table.startsAt),
    uniqueIndex().on(table.sourceProvider, table.sourceEventId),
  ],
);

export const eventTags = pgTable(
  "event_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [uniqueIndex().on(table.eventId, table.tag)],
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    reason: text("reason").notNull(),
    status: suggestionStatusEnum("status").notNull().default("pending"),
    calendarEventId: text("calendar_event_id"),
    decisionReasons: text("decision_reasons").notNull().default(""),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex().on(table.userId, table.eventId)],
);

export const tagPreferences = pgTable(
  "tag_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    weight: real("weight").notNull().default(0),
    votes: integer("votes").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex().on(table.userId, table.tag)],
);

export const smartMeetingPlans = pgTable(
  "smart_meeting_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    tags: text("tags").notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    minAcceptedParticipants: integer("min_accepted_participants").notNull(),
    responseWindowHours: integer("response_window_hours").notNull().default(24),
    slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
    maxAttempts: integer("max_attempts").notNull().default(3),
    searchWindowStart: timestamp("search_window_start", { withTimezone: true }).notNull(),
    searchWindowEnd: timestamp("search_window_end", { withTimezone: true }).notNull(),
    status: smartMeetingPlanStatusEnum("status").notNull().default("active"),
    latestRunId: uuid("latest_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index().on(table.createdBy), index().on(table.groupId), index().on(table.status)],
);

export const smartMeetingRuns = pgTable(
  "smart_meeting_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => smartMeetingPlans.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    responseDeadlineAt: timestamp("response_deadline_at", { withTimezone: true }).notNull(),
    calendarEventId: text("calendar_event_id"),
    invitedEmails: text("invited_emails").notNull().default(""),
    participantCount: integer("participant_count").notNull().default(0),
    acceptedCount: integer("accepted_count").notNull().default(0),
    declinedCount: integer("declined_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    status: smartMeetingRunStatusEnum("status").notNull().default("pending"),
    statusReason: text("status_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex().on(table.planId, table.attempt),
    index().on(table.planId),
    index().on(table.status),
    index().on(table.responseDeadlineAt),
  ],
);

export const smartMeetingMemberStats = pgTable(
  "smart_meeting_member_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    registeredUserId: uuid("registered_user_id").references(() => users.id, { onDelete: "set null" }),
    acceptCount: integer("accept_count").notNull().default(0),
    declineCount: integer("decline_count").notNull().default(0),
    noResponseCount: integer("no_response_count").notNull().default(0),
    lastResponse: smartMeetingResponseEnum("last_response"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex().on(table.ownerUserId, table.groupId, table.email),
    index().on(table.ownerUserId, table.groupId),
    index().on(table.registeredUserId),
  ],
);
