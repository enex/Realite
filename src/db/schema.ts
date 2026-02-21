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
]);
export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "calendar_inserted",
  "accepted",
  "declined",
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
