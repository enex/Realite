import { after, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  flushPostHogLogs,
  getServerLogger
} from "@/src/lib/posthog/server-logger";

const logger = getServerLogger();

export async function GET() {
  after(async () => {
    await flushPostHogLogs();
  });

  logger.info("Health check", { endpoint: "/api/health" });

  try {
    await getDb().execute(sql`SELECT 1`);

    return NextResponse.json(
      {
        status: "healthy",
        database: "ready"
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable";

    logger.error("Health check failed", {
      endpoint: "/api/health",
      error: message
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unavailable",
        error: message
      },
      { status: 503 }
    );
  }
}
