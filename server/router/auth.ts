import {
  phoneNumberSchema,
  validatePhoneNumber,
} from "@/shared/validation/phone";
import { ORPCError } from "@orpc/server";
import { jwtVerify } from "jose";
import * as uuid from "uuid";
import { z } from "zod";
import { protectedRoute, publicRoute } from "../orpc";
import { signJWT } from "../utils/jwt";

// Demo-Nutzer Konstanten für Store Reviews und lokales Testen
// Diese Nummern sind valide aber nicht vergeben - speziell für Tests reserviert
const DEMO_PHONE_NUMBERS = [
  // Deutsche Test-Nummern (0555-Bereich ist für Tests reserviert)
  "495551111111", // Demo User 1 - für Store Reviews
  "495552222222", // Demo User 2 - für lokales Testen
  "495553333333", // Demo User 3 - zusätzlicher Testnutzer
  // US Test-Nummern (555-Bereich ist für Tests/Filme reserviert)
  "12025550001", // US Demo User 1
  "12025550002", // US Demo User 2
];
const DEMO_CODE = "123456";

function fakeSignJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

export const authRouter = {
  getSession: protectedRoute.handler(async ({ context }) => {
    const ctx = context as { session: any };
    return ctx.session ?? null;
  }),
  me: publicRoute.handler(async ({ context }) => {
    const ctx = context as { session: any; db: typeof db };
    const res = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, ctx.session.id),
      columns: {
        id: true,
        email: true,
        image: true,
        name: true,
      },
    });

    let ret = { ...res };

    const events = await ctx.db.query.Event.findMany({
      where: eq(Event.actorId, ctx.session.id),
      orderBy: [asc(Event.time)],
    });

    console.log(events, ret);

    for (const ev of events) {
      const event = ev as EventData;
      switch (event.type) {
        case "user-registered":
          ret = { ...ret, ...event.data };
          break;
        case "user-profile-updated":
          ret = { ...ret, ...event.data };
          break;
      }
    }

    return ret;
  }),
  signOut: protectedRoute.handler(async ({ context }) => {
    return { success: true };
  }),
  refreshToken: protectedRoute.handler(async ({ context }) => {
    const ctx = context as { session: any; db: typeof db };
    const { session } = ctx;

    // Check if token should be refreshed
    if (!shouldRefreshToken(session)) {
      // Token is still valid and doesn't need refresh yet
      throw new ORPCError("BAD_REQUEST");
    }

    // Get user data to generate new token
    const user = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, session.id),
      columns: {
        id: true,
        name: true,
        image: true,
        phoneNumber: true,
      },
    });

    if (!user) throw new ORPCError("NOT_FOUND");

    // Generate new JWT token
    const newToken = await signJWT({
      phoneNumber: user.phoneNumber,
      id: user.id,
      name: user.name,
      image: user.image,
    });

    // Track token refresh event
    await saveEventWithAnalytics(ctx.db, {
      type: "token-refreshed",
      actorId: user.id,
      subject: user.id,
      data: {
        userId: user.id,
        phoneNumber: user.phoneNumber,
      },
    });

    return { token: newToken };
  }),
  requestSMSCode: publicRoute
    .input(z.object({ phoneNumber: phoneNumberSchema }))
    .handler(async ({ context, input }) => {
      const ctx = context as { db: typeof db };
      try {
        // Standardisiere die eingegebene Telefonnummer
        const validation = validatePhoneNumber(input.phoneNumber);
        const standardizedNumber = validation.standardizedNumber;

        // Track verification code request event
        await saveEventWithAnalytics(ctx.db, {
          type: "verification-code-requested",
          subject: "tel:+" + standardizedNumber,
          data: {
            phoneNumber: standardizedNumber,
            deviceInfo: {}, // Could be enhanced with actual device info
          },
        });

        // Demo-Nutzer: Code direkt in DB speichern, keine SMS senden
        if (DEMO_PHONE_NUMBERS.includes(standardizedNumber)) {
          await ctx.db.insert(VerificationCode).values({
            code: DEMO_CODE,
            phoneNumber: standardizedNumber,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });
          await saveEventWithAnalytics(ctx.db, {
            type: "verification-code-sent",
            subject: "tel:+" + standardizedNumber,
            data: {
              phoneNumber: standardizedNumber,
              code: DEMO_CODE,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          });

          return { success: true };
        }

        // Normaler Nutzer: Code generieren und SMS senden
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await ctx.db.insert(VerificationCode).values({
          code,
          phoneNumber: standardizedNumber,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });

        const message = `Ihr Verifizierungscode für realite.app lautet: ${code}`;
        await budgetSMS.sendSMS(standardizedNumber, message);

        await saveEventWithAnalytics(ctx.db, {
          type: "verification-code-sent",
          subject: "tel:+" + standardizedNumber,
          data: {
            phoneNumber: standardizedNumber,
            code,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        return { success: true };
      } catch (error) {
        console.error(error);
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  verifySMSCode: publicRoute
    .input(
      z.object({
        phoneNumber: phoneNumberSchema,
        code: z.string().length(6, "Der Code muss 6 Ziffern lang sein"),
      })
    )
    .handler(async ({ context, input }) => {
      const ctx = context as { db: typeof db; session?: any };
      // Standardisiere die eingegebene Telefonnummer für die Verifizierung
      const validation = validatePhoneNumber(input.phoneNumber);
      const standardizedNumber = validation.standardizedNumber;

      const verificationCode = await ctx.db.query.VerificationCode.findFirst({
        where: eq(VerificationCode.phoneNumber, standardizedNumber),
        orderBy: (vc) => [desc(vc.createdAt)],
      });

      const isValidCode =
        verificationCode &&
        verificationCode.code === input.code &&
        verificationCode.expiresAt >= new Date() &&
        verificationCode.attempts < 3;

      // Track verification attempt
      await saveEventWithAnalytics(ctx.db, {
        type: "verification-code-verified",
        subject: standardizedNumber,
        data: {
          phoneNumber: standardizedNumber,
          success: !!isValidCode,
          attemptCount: (verificationCode?.attempts ?? 0) + 1,
        },
      });

      if (!isValidCode) throw new ORPCError("BAD_REQUEST");

      let user = await ctx.db.query.User.findFirst({
        where: (t, { eq }) => eq(t.phoneNumber, standardizedNumber),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      const session = ctx.session;
      if (!user && session) {
        user = await ctx.db.query.User.findFirst({
          where: (t, { eq }) => eq(t.id, session.id),
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });
        if (user) {
          await ctx.db
            .update(User)
            .set({
              phoneNumber: standardizedNumber,
              phoneNumberHash: uuid.v5(
                standardizedNumber,
                PHONE_NUMBER_HASH_NAMESPACE
              ),
            })
            .where(eq(User.id, user.id));
        }
      }

      if (!user) {
        // create user
        [user] = await ctx.db
          .insert(User)
          .values({
            phoneNumber: standardizedNumber,
            phoneNumberHash: uuid.v5(
              standardizedNumber,
              PHONE_NUMBER_HASH_NAMESPACE
            ),
          })
          .returning({
            id: User.id,
            name: User.name,
            email: User.email,
            image: User.image,
          });

        if (user) {
          await ctx.db.insert(PhoneNumber).values({
            userId: user.id,
            phoneNumber: standardizedNumber,
            phoneNumberHash: uuid.v5(
              standardizedNumber,
              PHONE_NUMBER_HASH_NAMESPACE
            ),
          });

          // Track user registration
          await saveEventWithAnalytics(ctx.db, {
            type: "user-registered",
            actorId: user.id,
            subject: user.id,
            data: {
              phoneNumber: standardizedNumber,
              name: user.name ?? "",
              deviceInfo: {}, // Could be enhanced with actual device info
            },
          });
        }
      }

      if (!user) throw new ORPCError("INTERNAL_SERVER_ERROR");

      await ctx.db.delete(VerificationCode).where(
        or(
          eq(VerificationCode.phoneNumber, standardizedNumber),
          // remove all verification codes that are no longer valid
          lt(VerificationCode.expiresAt, new Date())
        )
      );

      // Track phone number verification success
      await saveEventWithAnalytics(ctx.db, {
        type: "phone-number-verified",
        actorId: user.id,
        subject: user.id,
        data: {
          phoneNumber: standardizedNumber,
          userId: user.id,
        },
      });

      // Generate JWT token after successful verification
      const token = await signJWT({
        phoneNumber: standardizedNumber,
        id: user.id,
        name: user.name,
        image: user.image,
      });

      return { token, ...user };
    }),
  createAnonymousUser: publicRoute
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
        token: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const ctx = context as { db: typeof db; session?: any };
      const userId = ctx.session?.id ?? uuid.v7();
      // Generate JWT token after successful verification
      const token = await signJWT({
        phoneNumber: "",
        id: userId,
        name: input.name,
        image: input.image,
      });
      if (input.token) {
        const decoded = await jwtVerify(
          input.token,
          new TextEncoder().encode(process.env.JWT_SECRET!)
        );
        // Track user registration
        await saveEventWithAnalytics(ctx.db, {
          type: "user-registered",
          actorId: userId,
          subject: userId,
          data: {
            name: input.name ?? "",
            deviceInfo: {}, // Could be enhanced with actual device info
          },
        });
        await saveEventWithAnalytics(ctx.db, {
          type: "session-created",
          subject: userId,
          data: {
            sessionToken: token,
            userId,
            expires: new Date(decoded.payload.exp! * 1000),
            invitation: {
              user: decoded.payload.iss!,
              createdAt: decoded.payload.iat!,
            },
          },
        });
      }
      return { token, id: userId };
    }),
};
