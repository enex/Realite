/**
 * MCP Servers Module
 *
 * Provides Model Context Protocol servers for:
 * - Consumer: Regular users managing plans and intents
 * - Admin: Administrative analytics and moderation
 *
 * Usage:
 * Import the handlers and add them to your HTTP server routes:
 *
 * ```typescript
 * import { handleConsumerMCPRequest, handleAdminMCPRequest } from "./mcp";
 *
 * // In your server:
 * if (url.pathname === "/mcp") {
 *   return handleConsumerMCPRequest(req);
 * }
 * if (url.pathname === "/mcp/admin") {
 *   return handleAdminMCPRequest(req);
 * }
 * ```
 *
 * Authentication:
 * Both servers require a Bearer token in the Authorization header.
 * The token is the same JWT token issued during phone verification.
 *
 * Example client configuration (for Claude Desktop, etc.):
 * ```json
 * {
 *   "mcpServers": {
 *     "realite": {
 *       "url": "https://your-server.com/mcp",
 *       "headers": {
 *         "Authorization": "Bearer YOUR_JWT_TOKEN"
 *       }
 *     }
 *   }
 * }
 * ```
 */

export {
  closeMCPSessions,
  handleAdminMCPRequest,
  handleConsumerMCPRequest,
} from "./handler";

export { authenticateMCPRequest, isAdmin, type MCPAuthContext } from "./auth";

export { createAdminMCPServer } from "./admin-server";
export { createConsumerMCPServer } from "./consumer-server";
