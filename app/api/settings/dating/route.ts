import { NextResponse } from "next/server";
import { z } from "zod";

import { DATE_MIN_AGE } from "@/src/lib/dating";
import { getDateHashtagStatus, updateUserDatingProfile } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const currentYear = new Date().getUTCFullYear();

const updateDatingSchema = z.object({
  enabled: z.boolean().optional(),
  birthYear: z.number().int().min(1900).max(currentYear).nullable().optional(),
  gender: z.enum(["woman", "man", "non_binary"]).nullable().optional(),
  isSingle: z.boolean().optional(),
  soughtGenders: z.array(z.enum(["woman", "man", "non_binary"])).max(3).optional(),
  soughtAgeMin: z.number().int().min(DATE_MIN_AGE).max(99).nullable().optional(),
  soughtAgeMax: z.number().int().min(DATE_MIN_AGE).max(99).nullable().optional(),
  soughtOnlySingles: z.boolean().optional()
});

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const status = await getDateHashtagStatus(user.id);
  return NextResponse.json(status);
}

export async function PATCH(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateDatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Dating-Einstellungen" }, { status: 400 });
  }

  const current = await getDateHashtagStatus(user.id);
  const nextProfile = {
    ...current.profile,
    ...parsed.data
  };

  if (
    nextProfile.soughtAgeMin !== null &&
    nextProfile.soughtAgeMax !== null &&
    nextProfile.soughtAgeMin > nextProfile.soughtAgeMax
  ) {
    return NextResponse.json({ error: "Der minimale Such-Alter muss kleiner oder gleich dem maximalen Alter sein." }, { status: 400 });
  }

  if (
    nextProfile.enabled &&
    nextProfile.birthYear !== null &&
    currentYear - nextProfile.birthYear < DATE_MIN_AGE
  ) {
    return NextResponse.json({ error: `Der Dating-Modus ist erst ab ${DATE_MIN_AGE} Jahren verfügbar.` }, { status: 400 });
  }

  await updateUserDatingProfile({
    userId: user.id,
    enabled: nextProfile.enabled,
    birthYear: nextProfile.birthYear,
    gender: nextProfile.gender,
    isSingle: nextProfile.isSingle,
    soughtGenders: nextProfile.soughtGenders,
    soughtAgeMin: nextProfile.soughtAgeMin,
    soughtAgeMax: nextProfile.soughtAgeMax,
    soughtOnlySingles: nextProfile.soughtOnlySingles
  });

  const status = await getDateHashtagStatus(user.id);
  return NextResponse.json(status);
}
