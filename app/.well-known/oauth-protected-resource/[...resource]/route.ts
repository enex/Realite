import { NextResponse } from "next/server";

import { AUTH_ISSUER, MCP_RESOURCE_AUDIENCE } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ resource: string[] }> }
) {
  const { resource } = await context.params;
  if (resource.join("/") !== "api/mcp") {
    return NextResponse.json({ error: "Protected resource not found" }, { status: 404 });
  }

  const metadata = {
    resource: MCP_RESOURCE_AUDIENCE,
    authorization_servers: [AUTH_ISSUER],
    scopes_supported: ["realite:read", "realite:write"]
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400"
    }
  });
}
