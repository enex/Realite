import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createEventComment,
  getPublicEventSharePreviewById,
  getVisibleEventForUserById,
  listEventComments
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const MAX_BODY_LENGTH = 2000;

const postBodySchema = z.object({
  body: z
    .string()
    .min(1, "Kommentar darf nicht leer sein")
    .max(MAX_BODY_LENGTH, `Kommentar maximal ${MAX_BODY_LENGTH} Zeichen`),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const user = await requireAppUser();

  if (user) {
    const event = await getVisibleEventForUserById({ userId: user.id, eventId });
    if (!event) {
      return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
    }
  } else {
    const publicPreview = await getPublicEventSharePreviewById(eventId);
    if (!publicPreview) {
      return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
    }
  }

  const comments = await listEventComments(eventId);
  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const event = await getVisibleEventForUserById({ userId: user.id, eventId });
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Ungültiger Kommentar";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const comment = await createEventComment({
      eventId,
      userId: user.id,
      body: parsed.data.body,
    });
    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json(
      { error: "Kommentar konnte nicht gespeichert werden" },
      { status: 400 }
    );
  }
}
