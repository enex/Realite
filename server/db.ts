import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "../db/schema";

export const db = drizzle(process.env.POSTGRES_URL!, {
  schema,
  logger: true,
  casing: "snake_case",
});

export type DB = typeof db;
export default db;
