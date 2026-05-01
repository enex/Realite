import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PAYLOAD_SEP = ".";

/** Short-lived proof the client passed REALITE_ADMIN_SECRET (cookie does not store the secret). */
export function createAdminSessionCookieValue(adminSecret: string, ttlSeconds: number): string {
  const expMs = Date.now() + ttlSeconds * 1000;
  const payloadJson = JSON.stringify({ exp: expMs });
  const payload = Buffer.from(payloadJson, "utf8").toString("base64url");
  const sig = createHmac("sha256", adminSecret).update(payload).digest("base64url");
  return `${payload}${COOKIE_PAYLOAD_SEP}${sig}`;
}

export function verifyAdminSessionCookieValue(
  adminSecret: string,
  cookieValue: string | undefined,
): boolean {
  if (!cookieValue?.includes(COOKIE_PAYLOAD_SEP)) {
    return false;
  }

  const lastDot = cookieValue.lastIndexOf(COOKIE_PAYLOAD_SEP);
  const payload = cookieValue.slice(0, lastDot);
  const sig = cookieValue.slice(lastDot + 1);

  if (!payload.length || !sig.length) {
    return false;
  }

  const expectedSig = createHmac("sha256", adminSecret).update(payload).digest("base64url");
  try {
    if (expectedSig.length !== sig.length) {
      return false;
    }

    const a = Buffer.from(expectedSig, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (!timingSafeEqual(a, b)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
