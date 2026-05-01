import { NextResponse } from "next/server";
import { z } from "zod";

import {
  RepositoryValidationError,
  createSinglesHereEvent,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { normalizeSinglesHereSlug } from "@/src/lib/singles-here";

const createSinglesEventSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  location: z.string().max(160).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSinglesEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    const event = await createSinglesHereEvent({
      userId: user.id,
      slug: normalizeSinglesHereSlug(parsed.data.slug),
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

    console.error("Singles-hier Event konnte nicht erstellt werden", error);
    return NextResponse.json(
      { error: "Singles-hier Event konnte nicht erstellt werden" },
      { status: 500 },
    );
  }
}
