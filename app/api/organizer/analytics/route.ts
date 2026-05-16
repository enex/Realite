import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getVisibleEventForUserById,
  recordOrganizerAnalyticsEvent,
  type OrganizerAnalyticsMetric,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  metric: z.enum([
    "event_page_view",
    "event_share_copy",
    "event_share_native",
    "event_qr_print_view",
  ]),
  sourcePath: z.string().max(300).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  const event = await getVisibleEventForUserById({
    userId: user.id,
    eventId: parsed.data.eventId,
  });
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  await recordOrganizerAnalyticsEvent({
    organizerUserId: event.createdBy,
    eventId: event.id,
    metric: parsed.data.metric as OrganizerAnalyticsMetric,
    sourcePath: parsed.data.sourcePath,
    actorUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
