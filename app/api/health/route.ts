import { after, NextResponse } from "next/server";

import { getDatabaseHealth } from "@/src/db/migrate";
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
  const health = getDatabaseHealth();

  if (health.state === "healthy") {
    return NextResponse.json(
      {
        status: "healthy",
        database: "ready"
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: "starting",
      database: health.state,
      error: health.error
    },
    { status: 503 }
  );
}
