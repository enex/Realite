import { describe, expect, test } from "bun:test";
import { makeSignature } from "better-auth/crypto";

import { buildMcpAuthorizeContinuationQuery } from "@/src/lib/mcp-oauth-query";

describe("mcp oauth query continuation", () => {
  test("keeps client data while removing the login prompt", async () => {
    const previousSecret = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET = "test-secret";

    try {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: "https://dev.bot.clye.app/oauth/client/demo",
        redirect_uri: "https://dev.bot.clye.app/oauth/callback",
        scope: "openid profile email realite:read realite:write",
        prompt: "login consent",
        state: "state-123",
        exp: String(Math.floor(Date.now() / 1000) + 300),
      });
      const sig = await makeSignature(params.toString(), process.env.BETTER_AUTH_SECRET);
      params.append("sig", sig);

      const nextQuery = await buildMcpAuthorizeContinuationQuery(params.toString());
      const nextParams = new URLSearchParams(nextQuery);

      expect(nextParams.get("client_id")).toBe("https://dev.bot.clye.app/oauth/client/demo");
      expect(nextParams.get("redirect_uri")).toBe("https://dev.bot.clye.app/oauth/callback");
      expect(nextParams.get("prompt")).toBe("consent");
      expect(nextParams.get("sig")).toBe(null);
      expect(nextParams.get("exp")).toBe(null);
    } finally {
      process.env.BETTER_AUTH_SECRET = previousSecret;
    }
  });
});
