import { describe, expect, test } from "bun:test";

import { getMcpCorsHeaders } from "@/src/lib/mcp-cors";
import {
  getMcpProtectedResourceMetadata,
  getMcpProtectedResourceMetadataUrl
} from "@/src/lib/mcp-oauth-metadata";

describe("mcp oauth metadata", () => {
  test("advertises the MCP resource and authorization server from the request origin", () => {
    const request = new Request("http://internal.local/.well-known/oauth-protected-resource/api/mcp", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "realite.app"
      }
    });

    expect(getMcpProtectedResourceMetadata(request)).toEqual({
      resource: "https://realite.app/api/mcp",
      authorization_servers: ["https://realite.app"],
      scopes_supported: ["realite:read", "realite:write"]
    });
    expect(getMcpProtectedResourceMetadataUrl(request)).toBe(
      "https://realite.app/.well-known/oauth-protected-resource/api/mcp"
    );
  });

  test("exposes WWW-Authenticate so browser MCP clients can read resource_metadata", () => {
    const request = new Request("https://realite.app/api/mcp", {
      headers: {
        origin: "http://localhost:6274"
      }
    });

    const headers = getMcpCorsHeaders(request, "POST, OPTIONS");

    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:6274");
    expect(headers["Access-Control-Expose-Headers"]).toBe("WWW-Authenticate");
  });
});
