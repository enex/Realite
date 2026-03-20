import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { AUTH_ISSUER, MCP_RESOURCE_AUDIENCE } from "@/src/lib/auth";
import { createRealiteMcpServer } from "@/src/lib/mcp";
import { getServerClient } from "@/src/lib/server-client";
import { requireAppUserFromAuthUserId } from "@/src/lib/session";

export const runtime = "nodejs";

function getProtectedResourceMetadataUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/.well-known/oauth-protected-resource/api/mcp`;
}

function unauthorizedResponse(request: Request, message: string) {
  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${getProtectedResourceMetadataUrl(request)}"`,
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function methodNotAllowed() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: "POST"
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

export async function POST(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return unauthorizedResponse(request, "Missing Bearer token");
  }

  let jwt: Awaited<ReturnType<ReturnType<typeof getServerClient>["verifyAccessToken"]>>;
  try {
    jwt = await getServerClient().verifyAccessToken(accessToken, {
      verifyOptions: {
        issuer: AUTH_ISSUER,
        audience: MCP_RESOURCE_AUDIENCE
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
    return await transport.handleRequest(request);
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function GET() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
