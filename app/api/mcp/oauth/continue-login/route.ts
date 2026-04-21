import { buildMcpAuthorizeContinuationQuery } from "@/src/lib/mcp-oauth-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const oauthQuery = requestUrl.searchParams.get("oauthQuery");

  if (!oauthQuery) {
    return new Response("Missing oauthQuery", { status: 400 });
  }

  try {
    // Better Auth expects custom login screens to resume the signed authorize query.
    const continuationQuery = await buildMcpAuthorizeContinuationQuery(oauthQuery);
    const authorizeUrl = new URL("/api/auth/oauth2/authorize", request.url);
    authorizeUrl.search = continuationQuery;
    return Response.redirect(authorizeUrl, 302);
  } catch {
    const errorUrl = new URL("/error", request.url);
    errorUrl.searchParams.set("error", "invalid_client");
    errorUrl.searchParams.set("error_description", "OAuth request could not be resumed");
    return Response.redirect(errorUrl, 302);
  }
}
