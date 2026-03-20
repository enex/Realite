import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/src/lib/request-origin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string[] }> }
) {
  const { resource } = await context.params;
  if (resource.join("/") !== "api/mcp") {
    return NextResponse.json({ error: "Protected resource not found" }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  const metadata = {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["realite:read", "realite:write"]
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400"
    }
  });
}
