import { NextResponse } from "next/server";

import { buildMcpCorsPreflightResponse, getMcpCorsHeaders } from "@/src/lib/mcp-cors";
import { MCP_RESOURCE_PATH, getMcpProtectedResourceMetadata } from "@/src/lib/mcp-oauth-metadata";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string[] }> }
) {
  const { resource } = await context.params;
  if (`/${resource.join("/")}` !== MCP_RESOURCE_PATH) {
    return NextResponse.json({ error: "Protected resource not found" }, { status: 404 });
  }

  const metadata = getMcpProtectedResourceMetadata(request);

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      ...getMcpCorsHeaders(request, "GET, OPTIONS")
    }
  });
}

export async function OPTIONS(request: Request) {
  return buildMcpCorsPreflightResponse(request, "GET, OPTIONS");
}
