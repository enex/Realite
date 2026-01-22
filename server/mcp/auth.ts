/**
 * MCP Authentication Middleware
 *
 * Provides authentication for MCP servers by verifying JWT tokens
 * that were issued through phone number verification.
 */

import { verifyJWT } from "../utils/jwt";

export interface MCPAuthContext {
  userId: string;
  name?: string | null;
  phoneNumber?: string | null;
  image?: string | null;
}

/**
 * Extracts and verifies the Bearer token from Authorization header
 * Returns the authenticated user context or null if not authenticated
 */
export async function authenticateMCPRequest(
  request: Request,
): Promise<MCPAuthContext | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  // Expect "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1];

  try {
    const payload = await verifyJWT(token);
    return {
      userId: payload.id,
      name: payload.name,
      phoneNumber: payload.phoneNumber,
      image: payload.image,
    };
  } catch (error) {
    console.error("[MCP Auth] Token verification failed:", error);
    return null;
  }
}

/**
 * Creates an unauthorized response for MCP
 */
export function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Valid Bearer token required",
      },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="realite-mcp"',
      },
    },
  );
}

/**
 * Creates a forbidden response for MCP (authenticated but not authorized)
 */
export function createForbiddenResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32002,
        message: message ?? "Forbidden: Insufficient permissions",
      },
      id: null,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

// Admin phone numbers - in production, this should come from a database or config
const ADMIN_PHONE_NUMBERS = new Set(
  [
    // Add admin phone numbers here
    process.env.ADMIN_PHONE_NUMBER,
  ].filter(Boolean),
);

/**
 * Checks if the authenticated user is an admin
 */
export function isAdmin(auth: MCPAuthContext): boolean {
  if (!auth.phoneNumber) return false;
  return ADMIN_PHONE_NUMBERS.has(auth.phoneNumber);
}
