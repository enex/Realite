import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const MIGRATION_LOCK_ID = 218031355;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const lockSql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });
  const migrationSql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(migrationSql);
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  try {
    console.log("[db:migrate:locked] waiting for advisory lock");
    await lockSql`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    console.log("[db:migrate:locked] acquired advisory lock");
    await migrate(db, { migrationsFolder });
    console.log("[db:migrate:locked] migrations applied");
  } catch (error) {
    console.error("[db:migrate:locked] migration failed");
    console.error(error);
    throw error;
  } finally {
    try {
      await lockSql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
    } finally {
      await Promise.all([
        lockSql.end({ timeout: 5 }),
        migrationSql.end({ timeout: 5 }),
      ]);
    }
  }
}

main().catch((error) => {
  console.error("[db:migrate:locked] failed", error);
  process.exit(1);
});
