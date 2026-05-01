import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getConfiguredAdminSecret,
  isAdminSecretConfigured,
  timingSafeStringEqual,
} from "@/src/lib/admin-auth";
import { createAdminSessionCookieValue } from "@/src/lib/admin-session-token";

const SESSION_SECONDS = 8 * 60 * 60;

export async function POST(request: Request) {
  const configured = getConfiguredAdminSecret();

  if (!isAdminSecretConfigured()) {
    return NextResponse.json({ ok: false, error: "Secret-Login nicht aktiviert." }, { status: 400 });
  }

  let body: { secret?: string };
  try {
    body = (await request.json()) as { secret?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const incoming = typeof body.secret === "string" ? body.secret.trim() : "";
  if (!timingSafeStringEqual(configured, incoming)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = createAdminSessionCookieValue(configured, SESSION_SECONDS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_SECONDS,
    path: "/",
  });
  return res;
}
