import { NextResponse } from "next/server";

import { adminDisableDatingProfile } from "@/src/lib/admin-singles-here";
import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const { userId } = await context.params;
  const trimmed = decodeURIComponent(userId).trim();
  if (!trimmed) {
    return NextResponse.json({ error: "userId erforderlich." }, { status: 400 });
  }

  await adminDisableDatingProfile(trimmed);
  return NextResponse.json({ ok: true });
}
