export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const oauthQuery = String(formData.get("oauthQuery") ?? "");
  const accept = String(formData.get("accept") ?? "false") === "true";
  const url = new URL("/api/auth/oauth2/consent", request.url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    },
    body: JSON.stringify({
      accept,
      oauth_query: oauthQuery
    }),
    cache: "no-store"
  });

  const payload = (await response.json()) as { redirect_uri?: string; error?: string };
  if (!response.ok || !payload.redirect_uri) {
    return new Response(payload.error ?? "Consent konnte nicht verarbeitet werden", { status: response.status || 400 });
  }

  return Response.redirect(payload.redirect_uri, 302);
}
