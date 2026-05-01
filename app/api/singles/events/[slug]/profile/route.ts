import { NextResponse } from "next/server";
import { z } from "zod";

import { DATE_MIN_AGE } from "@/src/lib/dating";
import {
  getSinglesHerePresence,
  updateUserDatingProfile,
  updateUserDisplayProfile,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const imageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(520_000);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  imageDataUrl: imageDataUrlSchema.optional().nullable(),
  birthDate: z.string().date(),
  gender: z.enum(["woman", "man", "non_binary"]),
  soughtGenders: z.array(z.enum(["woman", "man", "non_binary"])).min(1).max(3),
  soughtAgeMin: z.number().int().min(DATE_MIN_AGE).max(99),
  soughtAgeMax: z.number().int().min(DATE_MIN_AGE).max(99),
});

function getBirthYear(value: string) {
  return Number(value.slice(0, 4));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Profilangaben" }, { status: 400 });
  }

  if (parsed.data.soughtAgeMin > parsed.data.soughtAgeMax) {
    return NextResponse.json(
      { error: "Der Altersbereich ist ungültig." },
      { status: 400 },
    );
  }

  const birthYear = getBirthYear(parsed.data.birthDate);
  if (new Date().getUTCFullYear() - birthYear < DATE_MIN_AGE) {
    return NextResponse.json(
      { error: `Teilnahme ist erst ab ${DATE_MIN_AGE} Jahren möglich.` },
      { status: 400 },
    );
  }

  await Promise.all([
    updateUserDisplayProfile({
      userId: user.id,
      name: parsed.data.name,
      image: parsed.data.imageDataUrl ?? user.image ?? null,
    }),
    updateUserDatingProfile({
      userId: user.id,
      enabled: true,
      birthYear,
      gender: parsed.data.gender,
      isSingle: true,
      soughtGenders: parsed.data.soughtGenders,
      soughtAgeMin: parsed.data.soughtAgeMin,
      soughtAgeMax: parsed.data.soughtAgeMax,
      soughtOnlySingles: true,
    }),
  ]);

  const { slug } = await context.params;
  const presence = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presence) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: presence.profile,
    profileUnlocked: presence.profileUnlocked,
    age: presence.age,
  });
}
