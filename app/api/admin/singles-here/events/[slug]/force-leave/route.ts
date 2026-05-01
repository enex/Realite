import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";
import { adminForceLeaveSinglesHerePresence } from "@/src/lib/admin-singles-here";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId erforderlich." }, { status: 400 });
  }

  const { slug } = await context.params;
  const decoded = decodeURIComponent(slug);
  const result = await adminForceLeaveSinglesHerePresence({
    slug: decoded,
    targetUserId: userId,
    now: new Date(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
