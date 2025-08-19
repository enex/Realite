import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { Client } from "pg";

export const runMigrate = async () => {
  console.log("Running migrations... ", process.env.POSTGRES_URL);
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const migrationClient = new Client({
    connectionString: process.env.POSTGRES_URL,
  });
  await migrationClient.connect();
  const db = drizzle(migrationClient, { casing: "snake_case" });

  console.log("⏳ Running migrations...");

  const start = Date.now();
  const migrationsFolder = process.env.MIGRATIONS_FOLDER || "db/migrations";
  try {
    await migrate(db, { migrationsFolder });
  } catch (err) {
    const fullPath = path.resolve(process.cwd(), migrationsFolder);
    throw new Error("Failed to run migrations at " + fullPath, {
      cause: err,
    });
  }

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
};
