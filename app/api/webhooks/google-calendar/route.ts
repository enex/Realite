import { NextResponse } from "next/server";

import { triggerDashboardBackgroundSync } from "@/src/lib/background-sync";
import { getUserIdByCalendarChannelId } from "@/src/lib/repository";

/**
 * Google Calendar push webhook: Calendar sends POST when events change.
 * We look up the user by channel id and trigger an immediate sync so Realite
 * stays in sync with the calendar.
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
    triggerDashboardBackgroundSync(userId, { force: true });
  }

  return new NextResponse(null, { status: 200 });
}
