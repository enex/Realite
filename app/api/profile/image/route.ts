import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  PROFILE_IMAGE_PATH_PREFIX,
  uploadProfileImage,
} from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

const MAX_IMAGE_BYTES = 1_500_000;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kein Bild gefunden" }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Bitte lade ein PNG-, JPG- oder WebP-Bild hoch." },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Das Bild ist zu groß. Bitte wähle ein Bild unter 1,5 MB." },
      { status: 400 },
    );
  }

  try {
    const imageUrl = await uploadProfileImage({
      key: `${PROFILE_IMAGE_PATH_PREFIX}/${user.id}/${randomUUID()}.${extension}`,
      contentType: file.type,
      body: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Bild konnte nicht hochgeladen werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
