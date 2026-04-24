import { NextResponse } from "next/server";

import { acknowledgeWeeklyShareReferrals } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export async function POST() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  await acknowledgeWeeklyShareReferrals(user.id);
  return NextResponse.json({ ok: true });
}
