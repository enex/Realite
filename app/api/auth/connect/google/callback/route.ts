/**
 * Verarbeitet den Google-OAuth-Callback nach einem inkrementellen Berechtigungs-Connect.
 *
 * Tauscht den Authorization-Code gegen Tokens, aktualisiert authAccount und
 * calendarConnections mit den neuen Tokens + erweitertem Scope, leitet dann
 * zur ursprünglichen callbackUrl weiter.
 */

import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { authAccount, authUser } from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import { upsertGoogleConnection } from "@/src/lib/repository";

const BASE_URL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

type ConnectState = {
  userId: string;
  callbackUrl: string;
  scopeSet: "calendar" | "contacts";
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, BASE_URL));
}

function verifyState(signed: string): ConnectState | null {
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-secret";
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;

  const data = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (sig !== expected) return null;

  try {
    return JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8"),
    ) as ConnectState;
  } catch {
    return null;
  }
}

function getSafeCallbackUrl(url: string): string {
  try {
    const parsed = new URL(url, BASE_URL);
    if (parsed.origin === new URL(BASE_URL).origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // fall through
  }
  return "/settings";
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = `${BASE_URL}/api/auth/connect/google/callback`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  return response.json() as Promise<TokenResponse>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !rawState) {
    const reason = error ?? "missing_code";
    return redirectTo(`/settings?connect_error=${encodeURIComponent(reason)}`);
  }

  const state = verifyState(rawState);
  if (!state?.userId || !state.callbackUrl) {
    return redirectTo("/settings?connect_error=invalid_state");
  }

  const safeCallback = getSafeCallbackUrl(state.callbackUrl);

  const tokens = await exchangeCodeForTokens(code);
  if (tokens.error || !tokens.access_token) {
    console.error(
      "[google-connect] Token-Austausch fehlgeschlagen:",
      tokens.error,
      tokens.error_description,
    );
    return redirectTo(`${safeCallback}?connect_error=token_exchange`);
  }

  const db = getDb();

  // App-User → E-Mail finden, dann authUser-ID ermitteln
  const [appUser] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, state.userId))
    .limit(1);

  if (!appUser?.email) {
    return redirectTo(`${safeCallback}?connect_error=user_not_found`);
  }

  const [authUserRecord] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, appUser.email))
    .limit(1);

  // authAccount mit neuen Tokens + Scope aktualisieren (wenn vorhanden)
  if (authUserRecord?.id) {
    const [existingAccount] = await db
      .select({ id: authAccount.id, scope: authAccount.scope })
      .from(authAccount)
      .where(
        and(
          eq(authAccount.userId, authUserRecord.id),
          eq(authAccount.providerId, "google"),
        ),
      )
      .orderBy(desc(authAccount.updatedAt))
      .limit(1);

    if (existingAccount?.id) {
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const updateValues: Record<string, unknown> = {
        accessToken: tokens.access_token,
        scope: tokens.scope ?? existingAccount.scope,
        accessTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      };
      if (tokens.refresh_token) {
        updateValues.refreshToken = tokens.refresh_token;
      }

      await db
        .update(authAccount)
        .set(updateValues)
        .where(eq(authAccount.id, existingAccount.id));
    }
  }

  // calendarConnections direkt aktualisieren
  await upsertGoogleConnection({
    userId: state.userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : null,
    scope: tokens.scope ?? null,
  });

  return redirectTo(safeCallback);
}
