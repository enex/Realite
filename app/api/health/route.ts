import { NextResponse } from "next/server";

import { getDatabaseHealth } from "@/src/db/migrate";

export async function GET() {
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
