import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getOrganizerProfileByUserId,
  upsertOrganizerProfile,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const bodySchema = z.object({
  enabled: z.boolean(),
  displayName: z.string().max(80).optional().nullable(),
  bio: z.string().max(600).optional().nullable(),
  websiteUrl: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }
  const profile = await getOrganizerProfileByUserId(user.id);
  return NextResponse.json({
    profile: profile ?? {
      userId: user.id,
      enabled: false,
      displayName: null,
      bio: null,
      websiteUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function PATCH(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    const profile = await upsertOrganizerProfile({
      userId: user.id,
      enabled: parsed.data.enabled,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      websiteUrl: parsed.data.websiteUrl,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Veranstalterprofil konnte nicht gespeichert werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
