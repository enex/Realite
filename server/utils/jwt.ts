import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

// Schema für den JWT Payload
export const JWTPayloadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullish(),
  image: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  exp: z.number().optional(),
  iat: z.number().optional(),
});

// Schema für iCal-spezifische JWT Payload
export const ICalJWTPayloadSchema = z.object({
  id: z.string().uuid(),
  purpose: z.literal("ical"),
  iat: z.number().optional(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type ICalJWTPayload = z.infer<typeof ICalJWTPayloadSchema>;

// Geheimer Schlüssel für JWT Signierung
const JWT_SECRET = process.env.JWT_SECRET ?? "secret";
if (JWT_SECRET === "secret") {
  console.warn("🚨 JWT_SECRET is not set, using default secret 🚨");
}

// JWT Signierung - Extended expiration for mobile app
export async function signJWT(payload: Omit<JWTPayload, "exp" | "iat">) {
  const iat = Math.floor(Date.now() / 1000);
  // Set expiration to 1 year for mobile app to prevent automatic logout
  const exp = iat + 60 * 60 * 24 * 365; // 365 days

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(JWT_SECRET));

  return token;
}

// JWT Signierung für iCal - Kein Ablaufdatum für permanente Kalender-URLs
export async function signICalJWT(payload: Omit<ICalJWTPayload, "iat">) {
  const iat = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    // Kein setExpirationTime() - Token läuft nie ab
    .sign(new TextEncoder().encode(JWT_SECRET));

  return token;
}

// JWT Verifizierung
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    const result = JWTPayloadSchema.safeParse(payload);
    if (!result.success) {
      console.error(payload);
      console.error("Invalid token payload", result.error);
      throw new Error("Invalid token payload");
    }

    return result.data;
  } catch (error) {
    console.error("Invalid token: ", error);
    throw new Error("Invalid token");
  }
}

// iCal JWT Verifizierung - gibt nur User-ID zurück
export async function verifyICalJWT(token: string): Promise<ICalJWTPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    const result = ICalJWTPayloadSchema.safeParse(payload);
    if (!result.success) {
      console.error(payload);
      console.error("Invalid iCal token payload", result.error);
      throw new Error("Invalid iCal token payload");
    }

    return result.data;
  } catch (error) {
    console.error("Invalid iCal token: ", error);
    throw new Error("Invalid iCal token");
  }
}

// Check if token needs refresh (refresh when less than 30 days remaining)
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

  return timeUntilExpiry < thirtyDaysInSeconds;
}

// Get token expiration info
export function getTokenExpirationInfo(payload: JWTPayload): {
  expiresAt: Date | null;
  isExpired: boolean;
  shouldRefresh: boolean;
} {
  if (!payload.exp) {
    return {
      expiresAt: null,
      isExpired: false,
      shouldRefresh: false,
    };
  }

  const expiresAt = new Date(payload.exp * 1000);
  const now = new Date();
  const isExpired = expiresAt < now;
  const shouldRefresh = shouldRefreshToken(payload);

  return {
    expiresAt,
    isExpired,
    shouldRefresh,
  };
}
