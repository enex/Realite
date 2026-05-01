import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";
import { getSinglesHereEventAdminDetail } from "@/src/lib/admin-singles-here";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const { slug } = await context.params;
  const decoded = decodeURIComponent(slug);
  const detail = await getSinglesHereEventAdminDetail({ slug: decoded, now: new Date() });
  if (!detail) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json(detail);
}
