import { NextResponse } from "next/server";

import { deleteUserById } from "@/src/lib/repository";
import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
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

  const deleted = await deleteUserById(trimmed);
  if (!deleted) {
    return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
