import { splitSetCookieHeader } from "better-auth/cookies";

import { getAuth } from "@/src/lib/auth";
import { isDevelopmentAuthMode } from "@/src/lib/provider-adapters";

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

async function toRedirectResponse(signInResponse: Response, requestUrl: URL) {
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

function getCallbackUrl(requestUrl: URL) {
  return requestUrl.searchParams.get("callbackURL") ?? requestUrl.searchParams.get("callbackUrl") ?? "/";
}

function getSafeCallbackLocation(callbackUrl: string, requestUrl: URL) {
  const url = new URL(callbackUrl, requestUrl.origin);
  return url.origin === requestUrl.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
}

export async function handleSocialSignInRequest(request: Request, provider: "google" | "apple" | "microsoft") {
  const auth = getAuth();
  const requestUrl = new URL(request.url);
  const callbackURL = getCallbackUrl(requestUrl);
  const oauthQuery = requestUrl.searchParams.get("oauthQuery") ?? undefined;

  const body = {
    provider,
    callbackURL,
    ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
  };

  const signInResponse = await auth.api.signInSocial({
    body: body as typeof body & Record<string, unknown>,
    headers: new Headers(request.headers),
    asResponse: true
  });

  return toRedirectResponse(signInResponse, requestUrl);
}

function createAuthRequestHeaders(request: Request, requestUrl: URL) {
  const headers = new Headers(request.headers);

  if (!headers.has("origin")) {
    headers.set("origin", requestUrl.origin);
  }

  if (!headers.has("referer")) {
    headers.set("referer", requestUrl.origin);
  }

  return headers;
}

export async function handleAnonymousSignInRequest(request: Request) {
  const auth = getAuth();
  const requestUrl = new URL(request.url);
  const callbackURL = getCallbackUrl(requestUrl);
  const signInResponse = await auth.api.signInAnonymous({
    headers: createAuthRequestHeaders(request, requestUrl),
    asResponse: true
  });

  if (signInResponse.ok) {
    return createRedirectResponse(
      getSafeCallbackLocation(callbackURL, requestUrl),
      signInResponse.headers.get("set-cookie")
    );
  }

  return signInResponse;
}

export async function handleDevSignInRequest(request: Request) {
  if (!isDevelopmentAuthMode()) {
    return new Response("Not found", { status: 404 });
  }

  const auth = getAuth();
  const requestUrl = new URL(request.url);
  const callbackURL = getCallbackUrl(requestUrl);
  const oauthQuery = requestUrl.searchParams.get("oauthQuery") ?? undefined;
  const oauthBody = oauthQuery ? { oauth_query: oauthQuery } : {};
  const email = process.env.DEV_LOGIN_EMAIL?.trim() || "dev-login@realite.local";
  const password = process.env.DEV_LOGIN_PASSWORD?.trim() || "realite-dev-login";
  const name = process.env.DEV_LOGIN_NAME?.trim() || "Realite Dev";
  const headers = createAuthRequestHeaders(request, requestUrl);

  const signIn = async () => {
    const emailBody = {
      email,
      password,
      callbackURL,
      rememberMe: true as const,
      ...oauthBody,
    };
    return auth.api.signInEmail({
      body: emailBody as typeof emailBody & Record<string, unknown>,
      headers,
      asResponse: true
    });
  };

  let signInResponse = await signIn();

  if (!signInResponse.ok) {
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        callbackURL,
        rememberMe: true,
      },
      headers,
      asResponse: true
    });

    if (!signUpResponse.ok && signUpResponse.status !== 422) {
      return signUpResponse;
    }

    signInResponse = await signIn();
  }

  return toRedirectResponse(signInResponse, requestUrl);
}
