import { timingSafeEqual } from "node:crypto";

import { verifyAdminSessionCookieValue } from "@/src/lib/admin-session-token";

export const ADMIN_SESSION_COOKIE_NAME = "realite_admin_sess";

let cachedAdminEmailsEnv = "";
let cachedAdminEmails = new Set<string>();

/** Internal monitoring dashboard: allowlist REALITE_ADMIN_EMAILS and/or REALITE_ADMIN_SECRET. */
export function getConfiguredAdminSecret() {
  return (process.env.REALITE_ADMIN_SECRET ?? "").trim();
}

export function parseRealiteAdminEmailList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.includes("@") && p.length > 3);
}

/** Comma-, semicolon- or newline-separated; compared case-insensitively gegen Better-Auth-Session-E-Mail. */
export function getAdminEmailAllowlist(): ReadonlySet<string> {
  const raw = process.env.REALITE_ADMIN_EMAILS ?? "";
  if (cachedAdminEmailsEnv !== raw) {
    cachedAdminEmailsEnv = raw;
    cachedAdminEmails = new Set(parseRealiteAdminEmailList(raw));
  }
  return cachedAdminEmails;
}

export function hasAdminEmailAllowlist(): boolean {
  return getAdminEmailAllowlist().size > 0;
}

export function isAdminEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return getAdminEmailAllowlist().has(normalized);
}

export function isAdminSecretConfigured(): boolean {
  return getConfiguredAdminSecret().length >= 24;
}

export function isAdminConfigured(): boolean {
  return isAdminSecretConfigured() || hasAdminEmailAllowlist();
}

export function timingSafeStringEqual(expected: string, received: string) {
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Accepts Bearer === secret OR valid signed cookie (see admin-session-token). */
export function isAdminAuthorizedBySecret(secret: string, request: Request, sessionCookie?: string | null) {
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const bearer = authorization.slice("Bearer ".length).trim();
    if (timingSafeStringEqual(secret, bearer)) {
      return true;
    }
  }

  if (!sessionCookie) {
    return false;
  }

  return verifyAdminSessionCookieValue(secret, sessionCookie);
}
