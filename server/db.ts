import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
});

export const db = drizzle(pool, {
  schema,
  logger: true,
  casing: "snake_case",
});

export type DB = typeof db;
export default db;
