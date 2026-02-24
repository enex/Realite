import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { instrumentDrizzleClient } from "@kubiks/otel-drizzle";

let dbInstance: ReturnType<typeof drizzle> | null = null;

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

  // OpenTelemetry-Instrumentation für Drizzle-Queries
  // Erstellt automatisch Spans für alle DB-Queries mit Timing und SQL-Statements
  try {
    instrumentDrizzleClient(dbInstance, {
      dbSystem: "postgresql",
      // dbName wird aus DATABASE_URL extrahiert, falls verfügbar
      ...(url.includes("@") && {
        peerName: url.split("@")[1]?.split("/")[0]?.split(":")[0],
      }),
    });
  } catch (error) {
    // Fallback: Wenn OTel nicht initialisiert ist, wird die Instrumentation übersprungen
    // Das ist OK für lokale Entwicklung ohne OTLP-Config
    if (process.env.NODE_ENV !== "production") {
      console.warn("OpenTelemetry Drizzle instrumentation skipped:", error);
    }
  }

  return dbInstance;
}
