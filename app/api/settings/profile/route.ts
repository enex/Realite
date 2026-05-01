import { NextResponse } from "next/server";
import { z } from "zod";

import {
  updateUserProfileImage,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const profileSchema = z.object({
  imageUrl: z.string().url().max(1000).nullable(),
});

export async function PATCH(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiges Profilbild" }, { status: 400 });
  }

  const updated = await updateUserProfileImage({
    userId: user.id,
    image: parsed.data.imageUrl,
  });

  return NextResponse.json({
    profile: {
      name: updated?.name ?? user.name,
      email: updated?.email ?? user.email,
      image: updated?.image ?? null,
    },
  });
}
