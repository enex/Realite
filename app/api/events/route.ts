import { NextResponse } from "next/server";
import { z } from "zod";

import { syncPublicEventsFromGoogleCalendar } from "@/src/lib/google-calendar";
import { buildAvailabilityMap } from "@/src/lib/matcher";
import { createEvent, listVisibleEventsForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const createEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  visibility: z.enum(["public", "group"]).default("public"),
  groupId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([])
});

function serializeEvent(event: Awaited<ReturnType<typeof listVisibleEventsForUser>>[number], isAvailable: boolean) {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    isAvailable
  };
}

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  try {
    await syncPublicEventsFromGoogleCalendar(user.id);
  } catch {
    // Der Feed bleibt nutzbar, auch wenn der Sync temporär fehlschlägt.
  }

  const events = await listVisibleEventsForUser(user.id);
  const availability = await buildAvailabilityMap(user.id, events);

  return NextResponse.json({
    events: events.map((event) => serializeEvent(event, availability.get(event.id) ?? true))
  });
}

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "Ende muss nach Start liegen" }, { status: 400 });
  }

  const event = await createEvent({
    userId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    startsAt,
    endsAt,
    visibility: parsed.data.visibility,
    groupId: parsed.data.groupId,
    tags: parsed.data.tags
  });

  return NextResponse.json({ event });
}
