import { NextResponse } from "next/server";

import { buildMcpCorsPreflightResponse, getMcpCorsHeaders } from "@/src/lib/mcp-cors";
import { getMcpProtectedResourceMetadata } from "@/src/lib/mcp-oauth-metadata";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json(getMcpProtectedResourceMetadata(request), {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      ...getMcpCorsHeaders(request, "GET, OPTIONS")
    }
  });
}

export async function OPTIONS(request: Request) {
  return buildMcpCorsPreflightResponse(request, "GET, OPTIONS");
}
