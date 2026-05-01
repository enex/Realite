import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getConfiguredAdminSecret,
  hasAdminEmailAllowlist,
  isAdminAuthorizedBySecret,
  isAdminConfigured,
  isAdminEmailAllowlisted,
  isAdminSecretConfigured,
} from "@/src/lib/admin-auth";
import { getAuthSessionFromHeaders } from "@/src/lib/auth";

export type AdminAuthVia = "email" | "secret";

export type ResolvedAdminAuthorization =
  | { ok: false }
  | { ok: true; via: AdminAuthVia; adminEmail?: string };

/** E-Mail-Allowlist wird vor Secret-Gate geprüft (normale Realite-Anmeldung). */
export async function resolveAdminAuthorization(request: Request): Promise<ResolvedAdminAuthorization> {
  if (!isAdminConfigured()) {
    return { ok: false };
  }

  if (hasAdminEmailAllowlist()) {
    const session = await getAuthSessionFromHeaders(request.headers);
    const user = session?.user;
    if (
      user?.email &&
      user.isAnonymous !== true &&
      isAdminEmailAllowlisted(user.email)
    ) {
      return { ok: true, via: "email", adminEmail: user.email };
    }
  }

  if (isAdminSecretConfigured()) {
    const secret = getConfiguredAdminSecret();
    const jar = await cookies();
    const token = jar.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
    if (isAdminAuthorizedBySecret(secret, request, token)) {
      return { ok: true, via: "secret" };
    }
  }

  return { ok: false };
}

export async function isAdminRequestAuthorized(request: Request) {
  const resolved = await resolveAdminAuthorization(request);
  return resolved.ok;
}

export function adminNotConfiguredResponse() {
  return new Response(
    JSON.stringify({
      error:
        "Admin nicht konfiguriert. Mindestens eine Option: REALITE_ADMIN_EMAILS (kommagetrennte E-Mail-Adressen von Better-Auth-Accounts) und/oder REALITE_ADMIN_SECRET (min. 24 Zeichen).",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json" },
    },
  );
}

export function adminUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Nicht autorisiert." }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
