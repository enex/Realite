import { NextResponse } from "next/server";
import { processQueue } from "@/src/lib/job-queue";

/**
 * Processes pending jobs from the Postgres job queue. Optional HTTP-Trigger;
 * the main worker runs in-process (instrumentation.node.ts, Intervall JOB_QUEUE_POLL_MS).
 * Nutzbar für: manuellen Aufruf oder externen Cron. Secured mit CRON_SECRET.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? null;
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processQueue(10);
  return NextResponse.json({ processed });
}
