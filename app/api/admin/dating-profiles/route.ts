import { NextResponse } from "next/server";

import { listDatingProfilesForAdmin } from "@/src/lib/admin-dating-profiles";
import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "40");
  const offset = Number(searchParams.get("offset") ?? "0");

  const data = await listDatingProfilesForAdmin({
    limit: Number.isFinite(limit) ? limit : 40,
    offset: Number.isFinite(offset) ? offset : 0,
  });
  return NextResponse.json(data);
}
