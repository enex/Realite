import { pgTable } from "drizzle-orm/pg-core";

export const events = pgTable("events", (t) => ({
  id: t.uuid("id").primaryKey(),
  type: t.text("type").notNull(),
  subject: t.uuid("subject").notNull(),
  actor: t.uuid("actor"),
  time: t.timestamp("created_at").notNull().defaultNow(),
  data: t.jsonb("data").notNull(),
}));
