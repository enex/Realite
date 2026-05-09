import { createHmac, timingSafeEqual } from "node:crypto";

import {
  isValidSinglesHereSlug,
  normalizeSinglesHereSlug,
} from "@/src/lib/singles-here";

const TOKEN_SEPARATOR = ".";
const DEFAULT_TTL_SECONDS = 30 * 60;

type LiftTokenPayload = {
  u: string;
  s: string;
  e: number;
};

export type VerifiedLiftToken = {
  ownerUserId: string;
  singlesSlug: string;
  expiresAt: Date;
};

export type LiftTokenVerificationResult =
  | { ok: true; token: VerifiedLiftToken }
  | { ok: false; reason: "invalid" | "expired" };

export function getLiftTokenSecret() {
  return (
    process.env.BETTER_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-secret"
  );
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signatureMatches(expected: string, actual: string) {
  if (expected.length !== actual.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(actual, "utf8"),
    );
  } catch {
    return false;
  }
}

export function createLiftToken(input: {
  ownerUserId: string;
  singlesSlug: string;
  now?: Date;
  ttlSeconds?: number;
  secret?: string;
}) {
  const singlesSlug = normalizeSinglesHereSlug(input.singlesSlug);
  if (!isValidSinglesHereSlug(singlesSlug)) {
    throw new Error("Ungültiger Singles-hier-Slug");
  }

  const nowMs = input.now?.getTime() ?? Date.now();
  const expiresAt = Math.floor(
    (nowMs + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS) * 1000) / 1000,
  );
  const payload: LiftTokenPayload = {
    u: input.ownerUserId,
    s: singlesSlug,
    e: expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(
    encodedPayload,
    input.secret ?? getLiftTokenSecret(),
  );

  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`;
}

export function verifyLiftToken(input: {
  token: string;
  now?: Date;
  secret?: string;
}): LiftTokenVerificationResult {
  const separatorIndex = input.token.lastIndexOf(TOKEN_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === input.token.length - 1) {
    return { ok: false, reason: "invalid" };
  }

  const encodedPayload = input.token.slice(0, separatorIndex);
  const signature = input.token.slice(separatorIndex + 1);
  const expectedSignature = signPayload(
    encodedPayload,
    input.secret ?? getLiftTokenSecret(),
  );

  if (!signatureMatches(expectedSignature, signature)) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<LiftTokenPayload>;
    if (
      typeof parsed.u !== "string" ||
      !parsed.u ||
      typeof parsed.s !== "string" ||
      !isValidSinglesHereSlug(parsed.s) ||
      typeof parsed.e !== "number"
    ) {
      return { ok: false, reason: "invalid" };
    }

    const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000);
    if (parsed.e <= nowSeconds) {
      return { ok: false, reason: "expired" };
    }

    return {
      ok: true,
      token: {
        ownerUserId: parsed.u,
        singlesSlug: parsed.s,
        expiresAt: new Date(parsed.e * 1000),
      },
    };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
