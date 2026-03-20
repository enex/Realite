import { NextResponse } from "next/server";

import { buildDashboardPayload, buildDashboardRefreshPayload } from "@/src/lib/dashboard-data";
import { requireAppUser } from "@/src/lib/session";

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  return NextResponse.json(await buildDashboardPayload(user));
}

export async function POST() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  return NextResponse.json(buildDashboardRefreshPayload(user.id));
}
