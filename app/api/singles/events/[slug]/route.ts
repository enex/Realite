import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSinglesHerePresence,
  RepositoryValidationError,
  updateSinglesHereEvent,
} from "@/src/lib/repository";
import { buildSinglesHereClientPayload } from "@/src/lib/singles-here-payload";
import { requireAppUser } from "@/src/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { slug } = await context.params;
  const presence = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presence) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(
    await buildSinglesHereClientPayload(presence, user.image),
  );
}

const updateSinglesEventSchema = z.object({
  name: z.string().min(2).max(80),
  location: z.string().max(160).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
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
  const body = await request.json();
  const parsed = updateSinglesEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    const event = await updateSinglesHereEvent({
      userId: user.id,
      slug,
      name: parsed.data.name,
      location: parsed.data.location,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    });

    return NextResponse.json({
      event: {
        ...event,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof RepositoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Singles-hier Event konnte nicht aktualisiert werden", error);
    return NextResponse.json(
      { error: "Singles-hier Event konnte nicht aktualisiert werden" },
      { status: 500 },
    );
  }
}
