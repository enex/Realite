import { splitSetCookieHeader } from "better-auth/cookies";

import { auth } from "@/src/lib/auth";

function createRedirectResponse(location: string, setCookieHeader: string | null) {
  const headers = new Headers({ Location: location });

  if (setCookieHeader) {
    for (const value of splitSetCookieHeader(setCookieHeader)) {
      headers.append("set-cookie", value);
    }
  }

  return new Response(null, {
    status: 302,
    headers
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const callbackURL =
    requestUrl.searchParams.get("callbackURL") ?? requestUrl.searchParams.get("callbackUrl") ?? "/";

  const signOutResponse = await auth.api.signOut({
    headers: new Headers(request.headers),
    asResponse: true
  });

  return createRedirectResponse(
    new URL(callbackURL, requestUrl.origin).toString(),
    signOutResponse.headers.get("set-cookie")
  );
}
