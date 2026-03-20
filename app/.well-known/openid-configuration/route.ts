import { NextResponse } from "next/server";

import { getAuth } from "@/src/lib/auth";
import { withRequestOriginUrls } from "@/src/lib/oauth-metadata";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const metadata = await getAuth().api.getOpenIdConfig();

  return NextResponse.json(withRequestOriginUrls(request, metadata), {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400"
    }
  });
}
