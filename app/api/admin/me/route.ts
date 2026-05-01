import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  resolveAdminAuthorization,
} from "@/src/lib/admin-request-auth";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  const resolved = await resolveAdminAuthorization(request);
  if (!resolved.ok) {
    return adminUnauthorizedResponse();
  }

  return NextResponse.json({
    ok: true,
    via: resolved.via,
    email: resolved.adminEmail ?? null,
  });
}
