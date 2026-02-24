import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { instrumentDrizzleClient } from "@kubiks/otel-drizzle";

let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Führt eine minimale Query aus, um die erste DB-Verbindung aufzubauen.
 * Sollte beim Prozessstart (z. B. in instrumentation.node.ts) aufgerufen werden,
 * damit die erste echte Request nicht 300–600 ms für den Connection-Aufbau zahlt.
 */
export async function warmupDb(): Promise<void> {
  const db = getDb();
  await db.execute(sql`SELECT 1`);
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });

  dbInstance = drizzle(sql);

  // @kubiks/otel-drizzle: Spans für jede Drizzle-Query (SQL, Dauer, Operation).
  // Muss laufen, nachdem in instrumentation.node.ts der TracerProvider gesetzt wurde.
  const dbName = (() => {
    try {
      const u = new URL(url.replace(/^postgres(ql)?:\/\//i, "http://"));
      return u.pathname?.replace(/^\//, "") || undefined;
    } catch {
      return undefined;
    }
  })();
  const peerName = url.includes("@")
    ? url.split("@")[1]?.split("/")[0]?.split(":")[0]
    : undefined;

  instrumentDrizzleClient(dbInstance, {
    dbSystem: "postgresql",
    dbName,
    peerName,
    captureQueryText: true,
    maxQueryTextLength: 2000,
  });

  return dbInstance;
}
