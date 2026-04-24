import { getRequestOrigin } from "@/src/lib/request-origin";

export const MCP_RESOURCE_PATH = "/api/mcp";
export const MCP_SCOPES = ["realite:read", "realite:write"] as const;

export function getMcpResourceUrl(request: Request) {
  return `${getRequestOrigin(request)}${MCP_RESOURCE_PATH}`;
}

export function getMcpProtectedResourceMetadataUrl(request: Request) {
  return `${getRequestOrigin(request)}/.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`;
}

export function getMcpProtectedResourceMetadata(request: Request) {
  const origin = getRequestOrigin(request);

  return {
    resource: `${origin}${MCP_RESOURCE_PATH}`,
    authorization_servers: [origin],
    scopes_supported: [...MCP_SCOPES]
  };
}
