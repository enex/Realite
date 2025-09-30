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

export const plans = pgTable(
  "plans",
  (t) => ({
    id: t.uuid().primaryKey(),
    title: t.text().notNull(),
    description: t.text(),
    url: t.text(),
    activity: t.text().notNull(),
    seriesId: t.uuid(), // if this is a series, this is the id of the series, every instance is materialized but the app allows editing multiple events in one series together (like google calendar for example)
    //gatheringId: t.uuid().references(() => gatherings.id),
    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t.timestamp().notNull().defaultNow(),
    creatorId: t.uuid().notNull(),
    startDate: t.timestamp().notNull(),
    endDate: t.timestamp(), // if something repeats for ever this mey be set to infinity
    repetition: t.jsonb(), // repetition rule if it is a series
    maybe: t.boolean().notNull().default(false),
  }),
  (t) => [
    index().on(t.creatorId),
    index("plans_time_range").using(
      "gist",
      sql`tsrange(${t.startDate}, ${t.endDate})`,
    ),
  ],
);

export type InsertPlan = typeof plans.$inferInsert;

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
  (t) => [index("spatial_index").using("gist", t.location)],
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

export const planLocationRelations = relations(planLocations, ({ one }) => ({
  plan: one(plans, {
    relationName: "planLocations",
    fields: [planLocations.planId],
    references: [plans.id],
  }),
}));

export const planRelations = relations(plans, ({ many }) => ({
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
