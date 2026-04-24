import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { buildMcpCorsPreflightResponse, getMcpCorsHeaders } from "@/src/lib/mcp-cors";
import { createRealiteMcpServer } from "@/src/lib/mcp";
import {
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
  isMcpResourcePath
} from "@/src/lib/mcp-oauth-metadata";
import { getRequestOrigin } from "@/src/lib/request-origin";
import { getServerClient } from "@/src/lib/server-client";
import { requireAppUserFromAuthUserId } from "@/src/lib/session";

function unauthorizedResponse(request: Request, message: string) {
  const corsHeaders = getMcpCorsHeaders(request, "POST, OPTIONS");
  const { pathname } = new URL(request.url);

  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${getMcpProtectedResourceMetadataUrl(request, pathname)}"`,
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders
    }
  });
}

function methodNotAllowed(request: Request) {
  const corsHeaders = getMcpCorsHeaders(request, "POST, OPTIONS");
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: "POST, OPTIONS",
      ...corsHeaders
    }
  });
}

function getAccessToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : authorization.trim();
}

function getValidAudiences(request: Request) {
  const origin = getRequestOrigin(request);

  return [origin, ...[...new Set([getMcpResourceUrl(request), getMcpResourceUrl(request, "/mcp")])]];
}

export async function handleMcpPost(request: Request) {
  const { pathname } = new URL(request.url);
  if (!isMcpResourcePath(pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  const origin = getRequestOrigin(request);
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return unauthorizedResponse(request, "Missing Bearer token");
  }

  let jwt: Awaited<ReturnType<ReturnType<typeof getServerClient>["verifyAccessToken"]>>;
  try {
    jwt = await getServerClient().verifyAccessToken(accessToken, {
      verifyOptions: {
        issuer: origin,
        audience: getValidAudiences(request)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid access token";
    return unauthorizedResponse(request, message);
  }

  const authUserId = typeof jwt.sub === "string" ? jwt.sub.trim() : "";
  if (!authUserId) {
    return unauthorizedResponse(request, "Access token has no user subject");
  }

  const user = await requireAppUserFromAuthUserId(authUserId);
  if (!user) {
    return unauthorizedResponse(request, "Realite user not found");
  }

  const server = createRealiteMcpServer(user);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    const corsHeaders = getMcpCorsHeaders(request, "POST, OPTIONS");
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function handleMcpOptions(request: Request) {
  return buildMcpCorsPreflightResponse(request, "POST, OPTIONS");
}

export async function handleMcpGet(request: Request) {
  return methodNotAllowed(request);
}

export async function handleMcpDelete(request: Request) {
  return methodNotAllowed(request);
}
