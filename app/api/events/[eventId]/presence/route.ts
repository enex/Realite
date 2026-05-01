import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PRESENCE_LOCATION_NOTE_MAX_LENGTH,
  setEventPresenceStatus,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const eventPresenceSchema = z.object({
  status: z.enum(["checked_in", "left"]),
  visibleUntilIso: z.string().datetime().optional(),
  locationNote: z
    .string()
    .max(PRESENCE_LOCATION_NOTE_MAX_LENGTH)
    .optional()
    .nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = eventPresenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Vor-Ort-Status" }, { status: 400 });
  }

  const { eventId } = await context.params;

  try {
    const summary = await setEventPresenceStatus({
      userId: user.id,
      eventId,
      status: parsed.data.status,
      visibleUntil: parsed.data.visibleUntilIso
        ? new Date(parsed.data.visibleUntilIso)
        : undefined,
      locationNote: parsed.data.locationNote,
    });

    return NextResponse.json({
      ok: true,
      summary: {
        currentUserStatus: summary.currentUserStatus,
        currentUserVisibleUntilIso:
          summary.currentUserVisibleUntil?.toISOString() ?? null,
        currentUserPresenceLocationNote: summary.currentUserPresenceLocationNote,
        checkedInUsers: summary.checkedInUsers.map((entry) => ({
          userId: entry.userId,
          name: entry.name,
          email: entry.email,
          visibleUntilIso: entry.visibleUntil.toISOString(),
          presenceLocationNote: entry.presenceLocationNote,
        })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vor-Ort-Status konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
