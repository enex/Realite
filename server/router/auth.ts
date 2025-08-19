import { PHONE_NUMBER_HASH_NAMESPACE } from "@/shared/validation";
import {
  phoneNumberSchema,
  validatePhoneNumber,
} from "@/shared/validation/phone";
import { ORPCError } from "@orpc/server";
import { jwtVerify } from "jose";
import * as uuid from "uuid";
import { z } from "zod";
import { protectedRoute, publicRoute } from "../orpc";
import { budgetSMS } from "../services/budgetSMS";
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

export const authRouter = {
  getSession: protectedRoute.handler(async ({ context }) => {
    const ctx = context as { session: any };
    return ctx.session ?? null;
  }),
  me: protectedRoute.handler(async ({ context }) => {
    const ret = await context.es.projections.user.getProfile(
      context.session.id
    );
    return ret;
  }),
  signOut: protectedRoute.handler(async ({ context }) => {
    return { success: true };
  }),
  refreshToken: protectedRoute.handler(async ({ context }) => {
    const user = await context.es.projections.user.getProfile(
      context.session.id
    );

    if (!user) throw new ORPCError("NOT_FOUND");

    // Generate new JWT token
    const newToken = await signJWT({
      phoneNumber: user.phoneNumber,
      id: user.id,
      name: user.name,
      image: user.image,
    });

    context.es.add({
      type: "realite.auth.token-refreshed",
      subject: context.session.id,
      data: {},
    });

    return { token: newToken };
  }),
  requestSMSCode: publicRoute
    .input(z.object({ phoneNumber: phoneNumberSchema }))
    .handler(async ({ context, input }) => {
      try {
        // Standardisiere die eingegebene Telefonnummer
        const validation = validatePhoneNumber(input.phoneNumber);
        const standardizedNumber = validation.standardizedNumber;

        const phoneHash = uuid.v5(
          standardizedNumber,
          PHONE_NUMBER_HASH_NAMESPACE
        );

        // Demo-Nutzer: Code direkt in DB speichern, keine SMS senden
        if (DEMO_PHONE_NUMBERS.includes(standardizedNumber)) {
          await context.es.add({
            actor: phoneHash,
            subject: phoneHash,
            type: "realite.auth.phone-code-requested",
            data: {
              phoneNumber: standardizedNumber,
              deviceInfo: {}, // Could be enhanced with actual device info
              code: DEMO_CODE,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            },
          });

          return { success: true };
        }

        // Normaler Nutzer: Code generieren und SMS senden
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const message = `Ihr Verifizierungscode für realite.app lautet: ${code}`;
        await budgetSMS.sendSMS(standardizedNumber, message);

        await context.es.add({
          actor: phoneHash,
          subject: phoneHash,
          type: "realite.auth.phone-code-requested",
          data: {
            phoneNumber: standardizedNumber,
            deviceInfo: {}, // Could be enhanced with actual device info
            code,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        });

        return { success: true };
      } catch (error) {
        console.error(error);
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  verifySMSCode: publicRoute
    .errors({
      BAD_REQUEST: {
        message: "Der Code ist ungültig oder abgelaufen",
      },
    })
    .input(
      z.object({
        phoneNumber: phoneNumberSchema,
        code: z.string().length(6, "Der Code muss 6 Ziffern lang sein"),
      })
    )
    .handler(async ({ context, input, errors }) => {
      console.log("verifySMSCode", input);
      // Standardisiere die eingegebene Telefonnummer für die Verifizierung
      const validation = validatePhoneNumber(input.phoneNumber);
      const standardizedNumber = validation.standardizedNumber;
      const phoneHash = uuid.v5(
        standardizedNumber,
        PHONE_NUMBER_HASH_NAMESPACE
      );

      const verificationCode =
        await context.es.projections.auth.getVerificationCode(phoneHash);

      const isValidCode =
        verificationCode &&
        verificationCode.code === input.code &&
        new Date(verificationCode.expiresAt) >= new Date() &&
        verificationCode.attempts < 3;

      console.log("isValidCode", isValidCode);
      console.log("verificationCode", verificationCode);
      console.log("input.code", input.code);

      if (!isValidCode) {
        // Track verification attempt

        const reason =
          !verificationCode || verificationCode.code !== input.code
            ? "code-invalid"
            : "code-expired";

        await context.es.add({
          actor: phoneHash,
          subject: phoneHash,
          type: "realite.auth.phone-code-invalid",
          data: {
            phoneNumber: standardizedNumber,
            reason,
          },
        });
        throw errors.BAD_REQUEST({
          message: reason,
        });
      }

      let userId =
        await context.es.projections.auth.getUserIdByPhoneNumber(phoneHash);

      if (context.session?.id) {
        // make the currently signed in user the owner of the phone number
        await context.es.add({
          actor: phoneHash,
          subject: phoneHash,
          type: "realite.auth.phone-code-verified",
          data: {
            phoneNumber: standardizedNumber,
            userId: context.session.id,
          },
        });
        userId = context.session.id;
      }

      if (!userId) {
        // user is not registered yet, create a new user
        userId = uuid.v7();
        await context.es.add({
          actor: phoneHash,
          subject: phoneHash,
          type: "realite.user.registered",
          data: {
            phoneNumber: standardizedNumber,
            name: "",
            deviceInfo: {},
          },
        });
        await context.es.add({
          actor: phoneHash,
          subject: phoneHash,
          type: "realite.auth.phone-code-verified",
          data: {
            phoneNumber: standardizedNumber,
            userId,
          },
        });
      }

      const user = await context.es.projections.user.getProfile(userId);

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
      const userId = context.session?.id ?? uuid.v7();
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
        await context.es.add({
          type: "realite.user.registered",
          actor: userId,
          subject: userId,
          data: {
            name: input.name ?? "",
            deviceInfo: {}, // Could be enhanced with actual device info
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
