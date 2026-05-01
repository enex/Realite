import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSinglesHerePresence,
  PRESENCE_LOCATION_NOTE_MAX_LENGTH,
  RepositoryValidationError,
  updateEventPresenceLocationNote,
} from "@/src/lib/repository";
import { buildSinglesHereClientPayload } from "@/src/lib/singles-here-payload";
import { requireAppUser } from "@/src/lib/session";

const bodySchema = z.object({
  locationNote: z
    .string()
    .max(PRESENCE_LOCATION_NOTE_MAX_LENGTH)
    .nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { slug } = await context.params;
  const presenceBefore = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presenceBefore) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  const raw = await request.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    await updateEventPresenceLocationNote({
      userId: user.id,
      eventId: presenceBefore.event.id,
      locationNote: parsed.data.locationNote,
    });
  } catch (error) {
    const message =
      error instanceof RepositoryValidationError
        ? error.message
        : "Treffpunkt konnte nicht gespeichert werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const presence = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presence) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(
    await buildSinglesHereClientPayload(presence, user.image),
  );
}
