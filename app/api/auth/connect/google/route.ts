/**
 * Startet den inkrementellen Google-OAuth-Flow für Kalender oder Kontakte.
 *
 * Der Nutzer muss bereits eingeloggt sein. Dieser Endpunkt leitet ihn zu Google
 * weiter, um zusätzliche Berechtigungen zu erteilen – ohne sich komplett neu
 * anzumelden. Mit `include_granted_scopes=true` kombiniert Google die neu
 * erteilten Scopes mit den bereits vorhandenen.
 *
 * Query-Parameter:
 * - scope_set: "calendar" | "contacts" (Pflicht)
 * - callbackUrl: Ziel nach dem Connect (optional, Standard: /settings)
 *
 * Hinweis für Deployment:
 * Die Redirect-URI {BETTER_AUTH_URL}/api/auth/connect/google/callback muss
 * in der Google Cloud Console als autorisierte Redirect-URI eingetragen sein.
 */

import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  GOOGLE_CALENDAR_REQUIRED_SCOPES,
  GOOGLE_CONTACTS_REQUIRED_SCOPES,
} from "@/src/lib/provider-adapters";
import { requireAppUser } from "@/src/lib/session";

const BASE_URL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

export type GoogleConnectScopeSet = "calendar" | "contacts";

export type GoogleConnectState = {
  userId: string;
  callbackUrl: string;
  scopeSet: GoogleConnectScopeSet;
};

function signState(payload: GoogleConnectState): string {
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-secret";
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function getScopesForSet(scopeSet: GoogleConnectScopeSet): readonly string[] {
  if (scopeSet === "calendar") return GOOGLE_CALENDAR_REQUIRED_SCOPES;
  if (scopeSet === "contacts") return GOOGLE_CONTACTS_REQUIRED_SCOPES;
  return [];
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return new Response("Google-Login nicht konfiguriert.", { status: 503 });
  }

  const user = await requireAppUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=%2Fsettings", BASE_URL),
    );
  }

  const url = new URL(request.url);
  const rawScopeSet = url.searchParams.get("scope_set");
  const callbackUrl = url.searchParams.get("callbackUrl") ?? "/settings";

  if (rawScopeSet !== "calendar" && rawScopeSet !== "contacts") {
    return new Response("Ungültiger scope_set. Erlaubt: calendar, contacts.", {
      status: 400,
    });
  }

  const scopeSet = rawScopeSet as GoogleConnectScopeSet;
  const scopes = getScopesForSet(scopeSet);

  const state = signState({ userId: user.id, callbackUrl, scopeSet });
  const redirectUri = `${BASE_URL}/api/auth/connect/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  // Kombiniert neu erteilte Scopes mit bereits gewährten (z. B. openid, email, profile)
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("access_type", "offline");
  // prompt=consent stellt sicher, dass ein Refresh-Token zurückgegeben wird
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
