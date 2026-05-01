import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";
import { getSinglesHereAdminOverview } from "@/src/lib/admin-singles-here";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const data = await getSinglesHereAdminOverview({ now: new Date() });
  return NextResponse.json(data);
}
