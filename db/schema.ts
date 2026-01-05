import { relations, sql } from "drizzle-orm";
import { index, pgTable, QueryBuilder } from "drizzle-orm/pg-core";

export const events = pgTable("events", (t) => ({
  id: t.uuid("id").primaryKey(),
  type: t.text("type").notNull(),
  subject: t.uuid("subject").notNull(),
  actor: t.uuid("actor"),
  time: t.timestamp("created_at").notNull().defaultNow(),
  data: t.jsonb("data").notNull(),
}));

export const consumers = pgTable("consumers", (t) => ({
  id: t.uuid("id").primaryKey(),
  name: t.text("name").notNull(),
  version: t.integer("version").notNull(),
}));

export const intents = pgTable(
  "intents",
  (t) => ({
    id: t.uuid().primaryKey(),
    userId: t.uuid().notNull(),
    title: t.text().notNull(),
    description: t.text(),
    activity: t.text().notNull(),
    visibility: t.text().notNull().default("public"), // "public" | "contacts"
    status: t.text().notNull().default("active"), // "active" | "fulfilled" | "withdrawn"
    locationPreferences: t.jsonb(),
    timePreferences: t.jsonb(),
    fulfilledByPlanId: t.uuid(),
    withdrawnReason: t.text(),
    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t.timestamp().notNull().defaultNow(),
  }),
  (t) => [
    index().on(t.userId),
    index().on(t.activity),
    index().on(t.status),
    index().on(t.visibility),
  ]
);

export const intentRequests = pgTable(
  "intent_requests",
  (t) => ({
    id: t.uuid().primaryKey(),
    fromUserId: t.uuid().notNull(),
    toUserId: t.uuid().notNull(),
    activity: t.text().notNull(),
    title: t.text().notNull(),
    message: t.text(),
    status: t.text().notNull().default("pending"), // "pending" | "accepted" | "declined" | "counter"
    responseMessage: t.text(),
    planId: t.uuid(),
    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t.timestamp().notNull().defaultNow(),
    respondedAt: t.timestamp(),
  }),
  (t) => [
    index().on(t.toUserId),
    index().on(t.fromUserId),
    index().on(t.status),
    index().on(t.activity),
  ]
);

export const plans = pgTable(
  "plans",
  (t) => ({
    id: t.uuid().primaryKey(),
    title: t.text().notNull(),
    description: t.text(),
    url: t.text(),
    activity: t.text().notNull(),
    creatorId: t.uuid().notNull(),
    startDate: t.timestamp().notNull(),
    endDate: t.timestamp(), // if something repeats forever this may be set to infinity

    // Single mandatory location (directly in plans table)
    location: t.geometry({ type: "point", mode: "tuple", srid: 4326 }),
    locationAddress: t.text(),
    locationTitle: t.text(),
    locationUrl: t.text(),
    locationDescription: t.text(),

    // Series support (like Google Calendar)
    seriesId: t.uuid(), // ID der Serie (alle Instanzen teilen diese ID)
    seriesIndex: t.integer(), // 0, 1, 2, ... (welche Instanz in der Serie)

    // Gathering reference (external events like Facebook events, festivals, etc.)
    gatheringId: t.uuid(), // references gatherings table (when implemented)

    // Participation settings
    openTo: t.text(), // "specific" | "contacts" | "public"
    maxParticipants: t.integer(),

    // Based on another plan (when user joins someone else's plan)
    basedOnPlanId: t.uuid(),
    basedOnUserId: t.uuid(),

    // Status
    status: t.text().default("scheduled"), // "scheduled" | "cancelled" | "realized"

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t.timestamp().notNull().defaultNow(),
  }),
  (t) => [
    index().on(t.creatorId),
    index("plans_time_range").using(
      "gist",
      sql`tsrange(${t.startDate}, ${t.endDate})`
    ),
    index("plans_location_idx").using("gist", t.location),
    index().on(t.seriesId),
    index().on(t.gatheringId),
  ]
);

export type InsertPlan = typeof plans.$inferInsert;

// Legacy table - kept for migration purposes, but new plans should use location fields directly in plans table
// TODO: Remove after migration
export const planLocations = pgTable(
  "plan_locations",
  (t) => ({
    planId: t
      .uuid()
      .notNull()
      .references(() => plans.id),
    // https://orm.drizzle.team/docs/guides/postgis-geometry-point
    location: t
      .geometry({ type: "point", mode: "tuple", srid: 4326 })
      .notNull(),
    address: t.text(),
    url: t.text(),
    title: t.text(),
    description: t.text(),
    imageUrl: t.text(),
    category: t.text(),
  }),
  (t) => [index("spatial_index").using("gist", t.location)]
);
export type PlanLocation = typeof planLocations.$inferInsert;

/*
export const gatherings = pgTable("gatherings", (t) => ({
  id: t.uuid().primaryKey(),
  name: t.text().notNull(),
  description: t.text(),
  partOfGatheringId: t.uuid().references((): AnyPgColumn => gatherings.id),
  startDate: t.timestamp().notNull(),
  endDate: t.timestamp().notNull(),
  locationId: t.uuid().references(() => locations.id),
  url: t.text(),
  category: t.text(), // e.g., "festival", "sports", "cultural", "social", "business"
  isPublic: t.boolean().default(true),
  isRecurring: t.boolean().default(false),
  recurringPattern: t.text(),
  createdAt: t.timestamp().notNull().defaultNow(),
  updatedAt: t.timestamp().notNull().defaultNow(),
}));

export const planLocations = pgTable("plan_locations", (t) => ({
  planId: t
    .uuid()
    .notNull()
    .references(() => plans.id),
  locationId: t
    .uuid()
    .notNull()
    .references(() => locations.id),
}));

export const planTimes = pgTable("plan_times", (t) => ({
  planId: t
    .uuid()
    .notNull()
    .references(() => plans.id),
  startTime: t.timestamp().notNull(),
  endTime: t.timestamp().notNull(),
}));

export const locations = pgTable("locations", (t) => ({
  id: t.uuid().primaryKey(),
  name: t.text().notNull(),
  url: t.text(),
  address: t.text(),
  city: t.text(),
  state: t.text(),
}));

export const users = pgTable("users", (t) => ({
  id: t.uuid().primaryKey(),
  name: t.text().notNull(),
  email: t.text(),
  phoneNumber: t.text(),
  deviceInfo: t.jsonb(),
}));

export const profiles = pgTable("profiles", (t) => ({
  id: t
    .uuid()
    .primaryKey()
    .references(() => users.id),
  gender: t.text(),
  birthDate: t.timestamp(),
  relationshipStatus: t.text(),
}));
*/
// #region relations
/*
export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.id],
    references: [users.id],
  }),
}));

export const planRelations = relations(plans, ({ one }) => ({
  gathering: one(gatherings, {
    fields: [plans.gatheringId],
    references: [gatherings.id],
  }),
  creator: one(users, {
    fields: [plans.creatorId],
    references: [users.id],
  }),
}));
*/

// Legacy relations - kept for migration purposes
export const planLocationRelations = relations(planLocations, ({ one }) => ({
  plan: one(plans, {
    relationName: "planLocations",
    fields: [planLocations.planId],
    references: [plans.id],
  }),
}));

export const planRelations = relations(plans, ({ many }) => ({
  // Legacy: locations relation for old planLocations table
  // New plans have location directly in the plans table
  locations: many(planLocations, {
    relationName: "planLocations",
  }),
}));
/*
export const planTimeRelations = relations(planTimes, ({ one }) => ({
  plan: one(plans, {
    fields: [planTimes.planId],
    references: [plans.id],
  }),
}));

// #endregion
*/

/**
 * query builder for the database, very useful for writing complex queries without using a specific db or transaction directly
 *
 * @example
 * const q = schema.qb.select({ id: cards.id, aboutUrl: cards.aboutUrl }).from(cards).where(
 *   schema.isCardIsSharedWithSpace(cards.id, schema.spaceIdsSpaceIsPartOfIncludingSelf(session.user.personalSpaceId))
 * )
 */
export const qb = new QueryBuilder({
  casing: "snake_case",
});
