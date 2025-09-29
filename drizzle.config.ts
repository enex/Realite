import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
