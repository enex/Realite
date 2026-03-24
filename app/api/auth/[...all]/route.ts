import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/src/lib/auth";
import { buildMcpCorsPreflightResponse, getMcpCorsHeaders } from "@/src/lib/mcp-cors";

function withCors(request: Request, response: Response, methods: string) {
  const corsHeaders = getMcpCorsHeaders(request, methods);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: Request) {
  return withCors(
    request,
    await toNextJsHandler(getAuth()).GET(request),
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
}

export async function POST(request: Request) {
  return withCors(
    request,
    await toNextJsHandler(getAuth()).POST(request),
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
}

export async function PUT(request: Request) {
  return withCors(
    request,
    await toNextJsHandler(getAuth()).PUT(request),
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
}

export async function PATCH(request: Request) {
  return withCors(
    request,
    await toNextJsHandler(getAuth()).PATCH(request),
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
}

export async function DELETE(request: Request) {
  return withCors(
    request,
    await toNextJsHandler(getAuth()).DELETE(request),
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
}

export async function OPTIONS(request: Request) {
  return buildMcpCorsPreflightResponse(request, "GET, POST, PUT, PATCH, DELETE, OPTIONS");
}
