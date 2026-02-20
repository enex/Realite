import path from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { getDb } from "@/src/db/client";

type DatabaseState = "booting" | "migrating" | "healthy" | "unhealthy";

let state: DatabaseState = "booting";
let lastError: string | null = null;
let migratePromise: Promise<void> | null = null;
let lastAttemptAt = 0;

const RETRY_COOLDOWN_MS = 5_000;

async function runMigrations() {
  const db = getDb();
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  await migrate(db, {
    migrationsFolder
  });
}

function shouldRetryNow() {
  return Date.now() - lastAttemptAt >= RETRY_COOLDOWN_MS;
}

function triggerMigration() {
  if (migratePromise) {
    return;
  }

  if (state === "unhealthy" && !shouldRetryNow()) {
    return;
  }

  state = "migrating";
  lastAttemptAt = Date.now();

  migratePromise = runMigrations()
    .then(() => {
      state = "healthy";
      lastError = null;
    })
    .catch((error) => {
      state = "unhealthy";
      lastError = error instanceof Error ? error.message : "Migration failed";
    })
    .finally(() => {
      migratePromise = null;
    });
}

export function getDatabaseHealth() {
  if (state !== "healthy") {
    triggerMigration();
  }

  return {
    state,
    error: lastError
  };
}
