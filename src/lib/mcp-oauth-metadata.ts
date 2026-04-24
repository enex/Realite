import { getRequestOrigin } from "@/src/lib/request-origin";

export const MCP_RESOURCE_PATH = "/api/mcp";
export const MCP_RESOURCE_ALIAS_PATH = "/mcp";
export const MCP_RESOURCE_PATHS = [MCP_RESOURCE_PATH, MCP_RESOURCE_ALIAS_PATH] as const;
export const MCP_SCOPES = ["realite:read", "realite:write"] as const;

export function isMcpResourcePath(pathname: string) {
  return MCP_RESOURCE_PATHS.includes(pathname as (typeof MCP_RESOURCE_PATHS)[number]);
}

export function getMcpResourceUrl(request: Request, resourcePath = MCP_RESOURCE_PATH) {
  return `${getRequestOrigin(request)}${resourcePath}`;
}

export function getMcpProtectedResourceMetadataUrl(request: Request, resourcePath = MCP_RESOURCE_PATH) {
  return `${getRequestOrigin(request)}/.well-known/oauth-protected-resource${resourcePath}`;
}

export function getMcpProtectedResourceMetadata(request: Request, resourcePath = MCP_RESOURCE_PATH) {
  const origin = getRequestOrigin(request);

  return {
    resource: `${origin}${resourcePath}`,
    authorization_servers: [origin],
    scopes_supported: [...MCP_SCOPES]
  };
}
