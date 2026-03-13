import { NextResponse } from "next/server";

import { enqueue, JOB_TYPE_DASHBOARD_SYNC } from "@/src/lib/job-queue";
import { getUserIdByCalendarChannelId } from "@/src/lib/repository";

/**
 * Google Calendar push webhook: Calendar sends POST when events change.
 * We enqueue a dashboard-sync job and return 200 immediately. A cron worker
 * (and optionally an immediate trigger) processes the queue so sync runs in
 * the background without blocking the webhook.
 */
export async function POST(request: Request) {
  const channelId = request.headers.get("X-Goog-Channel-ID");
  const resourceState = request.headers.get("X-Goog-Resource-State");

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
  }

  const userId = await getUserIdByCalendarChannelId(channelId);
  if (!userId) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  if (resourceState === "sync" || resourceState === "exists") {
    await enqueue(JOB_TYPE_DASHBOARD_SYNC, { userId });
    triggerProcessQueueInBackground();
  }

  return new NextResponse(null, { status: 200 });
}

/** Fire-and-forget: trigger process-queue so a worker runs without waiting for cron. */
function triggerProcessQueueInBackground() {
  const baseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.REALITE_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) return;
  const url = `${baseUrl.replace(/\/+$/, "")}/api/cron/process-queue`;
  fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(1),
  }).catch(() => {});
}
