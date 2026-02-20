import { NextResponse } from "next/server";

import { joinGroupByToken } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { token } = await context.params;

  try {
    const groupId = await joinGroupByToken({ token, userId: user.id });
    return NextResponse.json({ ok: true, groupId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Join fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
