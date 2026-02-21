import { splitSetCookieHeader } from "better-auth/cookies";

import { getAuth } from "@/src/lib/auth";

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
  const auth = getAuth();
  const requestUrl = new URL(request.url);
  const callbackURL =
    requestUrl.searchParams.get("callbackURL") ?? requestUrl.searchParams.get("callbackUrl") ?? "/";

  const signInResponse = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL
    },
    headers: new Headers(request.headers),
    asResponse: true
  });

  const locationHeader = signInResponse.headers.get("location");
  if (locationHeader) {
    return createRedirectResponse(
      new URL(locationHeader, requestUrl.origin).toString(),
      signInResponse.headers.get("set-cookie")
    );
  }

  try {
    const payload = (await signInResponse.clone().json()) as { url?: string };
    if (payload.url) {
      return createRedirectResponse(
        new URL(payload.url, requestUrl.origin).toString(),
        signInResponse.headers.get("set-cookie")
      );
    }
  } catch {
    // Fallback: return original response if provider response is not JSON.
  }

  return signInResponse;
}
