import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addAttendeeToSourceEvent,
  getSourceEventAttendees
} from "@/src/lib/google-calendar";
import {
  getVisibleEventForUserById,
  listGroupContactsForUser
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const INVITE_SUGGESTION_COUNT = 3;
const SEARCH_CANDIDATES_LIMIT = 10;

function normalizeEmailForMatch(email: string) {
  return email.trim().toLowerCase();
}

function isEventInviteable(event: {
  createdBy: string;
  sourceProvider: string | null;
  sourceEventId: string | null;
}) {
  return (
    event.sourceProvider === "google" &&
    Boolean(event.sourceEventId?.trim())
  );
}

/** Unique contacts by primary email, excluding owner's email. */
function uniqueContactsForInvite(
  contacts: Awaited<ReturnType<typeof listGroupContactsForUser>>,
  ownerEmail: string
) {
  const ownerNorm = normalizeEmailForMatch(ownerEmail);
  const byEmail = new Map<
    string,
    { email: string; name: string | null; image: string | null }
  >();
  for (const c of contacts) {
    const email = c.emails[0] ?? c.email;
    const norm = normalizeEmailForMatch(email);
    if (norm === ownerNorm) continue;
    if (!byEmail.has(norm)) {
      byEmail.set(norm, {
        email: norm,
        name: c.name ?? null,
        image: c.image ?? null
      });
    }
  }
  return Array.from(byEmail.values());
}

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const event = await getVisibleEventForUserById({ userId: user.id, eventId });
  if (!event || event.createdBy !== user.id || !isEventInviteable(event)) {
    return NextResponse.json(
      { error: "Event nicht gefunden oder Einladungen nicht möglich" },
      { status: 404 }
    );
  }

  const alreadyInvited =
    (await getSourceEventAttendees({
      ownerUserId: event.createdBy,
      sourceEventId: event.sourceEventId!
    })) ?? [];

  const allContacts = await listGroupContactsForUser(user.id);
  const uniqueContacts = uniqueContactsForInvite(
    allContacts,
    user.email
  ).filter((c) => !alreadyInvited.includes(c.email));

  const suggestedContacts = uniqueContacts.slice(0, INVITE_SUGGESTION_COUNT);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  let candidates: Array<{ email: string; name: string | null; image: string | null }> =
    [];

  if (q && q.length >= 1) {
    const qLower = q.toLowerCase();
    const matches = uniqueContacts.filter(
      (c) =>
        c.email.includes(qLower) ||
        (c.name?.toLowerCase().includes(qLower) ?? false)
    );
    candidates = matches.slice(0, SEARCH_CANDIDATES_LIMIT);
    const looksLikeEmail =
      q.includes("@") && q.length >= 3 && !candidates.some((c) => c.email === normalizeEmailForMatch(q));
    if (looksLikeEmail) {
      const emailNorm = normalizeEmailForMatch(q);
      if (emailNorm !== normalizeEmailForMatch(user.email) && !alreadyInvited.includes(emailNorm)) {
        candidates = [{ email: emailNorm, name: null, image: null }, ...candidates].slice(
          0,
          SEARCH_CANDIDATES_LIMIT
        );
      }
    }
  }

  return NextResponse.json({
    alreadyInvitedEmails: alreadyInvited,
    suggestedContacts,
    ...(q !== undefined && q !== null ? { candidates } : {}),
  });
}

const inviteBodySchema = z.object({
  email: z.string().min(1).max(320),
});

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
  if (!event || event.createdBy !== user.id || !isEventInviteable(event)) {
    return NextResponse.json(
      { error: "Event nicht gefunden oder Einladungen nicht möglich" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = inviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige E-Mail-Adresse" },
      { status: 400 }
    );
  }

  const attendeeEmail = normalizeEmailForMatch(parsed.data.email);
  const ownEmail = normalizeEmailForMatch(user.email);
  if (attendeeEmail === ownEmail) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst einladen" },
      { status: 400 }
    );
  }

  try {
    const ok = await addAttendeeToSourceEvent({
      ownerUserId: event.createdBy,
      sourceEventId: event.sourceEventId!,
      attendeeEmail,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Einladung konnte nicht gesendet werden" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Einladung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
