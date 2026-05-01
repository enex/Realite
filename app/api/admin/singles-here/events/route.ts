import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";
import { listSinglesHereEventsForAdmin } from "@/src/lib/admin-singles-here";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const rows = await listSinglesHereEventsForAdmin({ now: new Date(), maxRows: 80 });
  const sanitized = rows.map(({ activeCheckedInUserIds: _omit, ...rest }) => rest);
  return NextResponse.json({ events: sanitized });
}
