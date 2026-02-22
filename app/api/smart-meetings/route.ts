import { NextResponse } from "next/server";
import { z } from "zod";

import { SmartMeetingValidationError, createSmartMeetingPlanWithInitialRun } from "@/src/lib/smart-meetings";
import { requireAppUser } from "@/src/lib/session";

const createSmartMeetingSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  groupId: z.string().uuid(),
  tags: z.array(z.string().max(40)).default([]),
  durationMinutes: z.number().int().min(15).max(1440),
  minAcceptedParticipants: z.number().int().min(1).max(50),
  responseWindowHours: z.number().int().min(1).max(14 * 24).optional(),
  searchWindowStart: z.string().datetime(),
  searchWindowEnd: z.string().datetime(),
  slotIntervalMinutes: z.number().int().min(15).max(180).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional()
});

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSmartMeetingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    const created = await createSmartMeetingPlanWithInitialRun({
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      groupId: parsed.data.groupId,
      tags: parsed.data.tags,
      durationMinutes: parsed.data.durationMinutes,
      minAcceptedParticipants: parsed.data.minAcceptedParticipants,
      responseWindowHours: parsed.data.responseWindowHours,
      searchWindowStart: new Date(parsed.data.searchWindowStart),
      searchWindowEnd: new Date(parsed.data.searchWindowEnd),
      slotIntervalMinutes: parsed.data.slotIntervalMinutes,
      maxAttempts: parsed.data.maxAttempts
    });

    return NextResponse.json({
      smartMeeting: {
        ...created,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof SmartMeetingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Smart-Meeting konnte nicht erstellt werden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
