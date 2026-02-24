import { NextResponse } from "next/server";
import { z } from "zod";

import { SmartMeetingValidationError, updateSmartMeetingPlan } from "@/src/lib/smart-meetings";
import { requireAppUser } from "@/src/lib/session";

const updateSmartMeetingSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  groupId: z.string().uuid().optional(),
  tags: z.array(z.string().max(40)).optional(),
  durationMinutes: z.number().int().min(15).max(1440).optional(),
  minAcceptedParticipants: z.number().int().min(1).max(50).optional(),
  responseWindowHours: z.number().int().min(1).max(14 * 24).optional(),
  searchWindowStart: z.string().datetime().optional(),
  searchWindowEnd: z.string().datetime().optional(),
  slotIntervalMinutes: z.number().int().min(15).max(180).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { planId } = await params;
  const body = await request.json();
  const parsed = updateSmartMeetingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    await updateSmartMeetingPlan(planId, user.id, {
      title: data.title,
      description: data.description,
      location: data.location,
      groupId: data.groupId,
      tags: data.tags,
      durationMinutes: data.durationMinutes,
      minAcceptedParticipants: data.minAcceptedParticipants,
      responseWindowHours: data.responseWindowHours,
      searchWindowStart: data.searchWindowStart
        ? new Date(data.searchWindowStart)
        : undefined,
      searchWindowEnd: data.searchWindowEnd
        ? new Date(data.searchWindowEnd)
        : undefined,
      slotIntervalMinutes: data.slotIntervalMinutes,
      maxAttempts: data.maxAttempts
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SmartMeetingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Smart-Treffen konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
