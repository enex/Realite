import { NextResponse } from "next/server";

import { getSinglesHerePresence } from "@/src/lib/repository";
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
