/**
 * MCP HTTP Handler
 *
 * Handles HTTP requests for MCP servers using the Streamable HTTP transport.
 * Uses STATELESS mode to support multiple backend instances.
 *
 * Each request creates a fresh transport and MCP server. Authentication is
 * handled via JWT tokens, so no server-side session state is needed.
 *
 * Endpoints:
 * - POST /mcp - Consumer MCP server (requires auth)
 * - POST /mcp/admin - Admin MCP server (requires admin auth)
 *
 * Note: GET (SSE streams) and DELETE (session termination) are not supported
 * in stateless mode. Clients should use JSON response mode.
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAdminMCPServer } from "./admin-server";
import {
  authenticateMCPRequest,
  createForbiddenResponse,
  createUnauthorizedResponse,
  isAdmin,
} from "./auth";
import { createConsumerMCPServer } from "./consumer-server";

/**
 * Create a JSON error response
 */
function createJsonError(
  status: number,
  code: number,
  message: string,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Handle consumer MCP requests (stateless mode)
 *
 * Each request creates a fresh transport and server. The user is authenticated
 * via the JWT token in the Authorization header.
 */
export async function handleConsumerMCPRequest(
  request: Request,
): Promise<Response> {
  // Only POST is supported in stateless mode
  if (request.method.toUpperCase() !== "POST") {
    return createJsonError(
      405,
      -32000,
      "Method not allowed. Only POST is supported in stateless mode.",
    );
  }

  // Authenticate the request
  const auth = await authenticateMCPRequest(request);
  if (!auth) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Create a stateless transport (no session management)
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true, // Use JSON responses instead of SSE
    });

    // Create and connect the MCP server for this request
    const server = createConsumerMCPServer(auth);
    await server.connect(transport);

    // Handle the request
    const response = await transport.handleRequest(request, {
      parsedBody: body,
    });

    // Clean up after response is sent
    transport.onclose = () => {
      server.close();
    };

    return response;
  } catch (error) {
    console.error("[MCP Consumer] Error:", error);
    return createJsonError(500, -32603, "Internal server error");
  }
}

/**
 * Handle admin MCP requests (stateless mode)
 *
 * Each request creates a fresh transport and server. The user is authenticated
 * via the JWT token and must be an admin.
 */
export async function handleAdminMCPRequest(
  request: Request,
): Promise<Response> {
  // Only POST is supported in stateless mode
  if (request.method.toUpperCase() !== "POST") {
    return createJsonError(
      405,
      -32000,
      "Method not allowed. Only POST is supported in stateless mode.",
    );
  }

  // Authenticate the request
  const auth = await authenticateMCPRequest(request);
  if (!auth) {
    return createUnauthorizedResponse();
  }

  // Check admin status
  if (!isAdmin(auth)) {
    return createForbiddenResponse("Admin access required");
  }

  try {
    const body = await request.json();

    // Create a stateless transport (no session management)
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true, // Use JSON responses instead of SSE
    });

    // Create and connect the MCP server for this request
    const server = createAdminMCPServer(auth);
    await server.connect(transport);

    // Handle the request
    const response = await transport.handleRequest(request, {
      parsedBody: body,
    });

    // Clean up after response is sent
    transport.onclose = () => {
      server.close();
    };

    return response;
  } catch (error) {
    console.error("[MCP Admin] Error:", error);
    return createJsonError(500, -32603, "Internal server error");
  }
}

/**
 * Cleanup function - no-op in stateless mode
 * Kept for API compatibility
 */
export async function closeMCPSessions(): Promise<void> {
  // No-op in stateless mode - each request is self-contained
  console.log("[MCP] Stateless mode - no sessions to close");
}
