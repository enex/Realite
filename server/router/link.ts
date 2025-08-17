import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import * as uuid from "uuid";
import { z } from "zod";

import { db } from "@realite/db/client";
import { enlargeUUID, shortenUUID } from "@realite/validators";

import { env } from "../env";
import { saveEventWithAnalytics } from "../events";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        targetId: z.string().uuid(),
        targetType: z.enum(["realite", "profile"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inviterId = ctx.session.id;
      const id = uuid.v7();
      const code = shortenUUID(id);
      await saveEventWithAnalytics(ctx.db, {
        type: "link-created",
        actorId: inviterId,
        subject: id,
        data: { linkType: input.targetType, targetId: input.targetId },
      });
      return { code };
    }),
  get: publicProcedure
    .input(
      z.object({
        code: z.string().transform((inp, ctx) => {
          if (uuid.validate(inp)) return inp;
          try {
            return enlargeUUID(inp);
          } catch (e) {
            console.error(e);
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid link ID",
            });
            return z.NEVER;
          }
        }),
      }),
    )
    .output(
      z.object({
        targetId: z.string().uuid(),
        targetType: z.enum(["realite", "profile"]),
      }),
    )
    .query(async ({ input }) => {
      // input.code may be shortened; enlarge back to full uuid
      const fullId = uuid.validate(input.code)
        ? input.code
        : enlargeUUID(input.code);
      const events = await db.query.Event.findMany({
        where: (t, { eq, and }) =>
          and(eq(t.type, "link-created"), eq(t.subject, fullId)),
      });
      if (events.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link not found",
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return events[events.length - 1]!.data as any;
    }),
  token: protectedProcedure.query(async ({ ctx }) => {
    const iat = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(iat)
      .setIssuer(shortenUUID(ctx.session.id))
      .sign(new TextEncoder().encode(env.JWT_SECRET));
    return token;
  }),
  /**
   * Called when a link was opened. Creates mutual contact connection between
   * inviter (issuer embedded in token) and invitee (current session user).
   */
  onOpen: publicProcedure
    .input(
      z.object({
        code: z.string(),
        token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify invitee token and extract user id
      const decoded = await (async () => {
        try {
          const { jwtVerify } = await import("jose");
          return await jwtVerify(
            input.token,
            new TextEncoder().encode(env.JWT_SECRET),
          );
        } catch {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid token",
          });
        }
      })();
      const inviteeId = (decoded.payload as { id?: string } | undefined)?.id;
      if (!inviteeId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid token payload",
        });
      }
      // Record link-opened
      await saveEventWithAnalytics(ctx.db, {
        type: "link-opened",
        actorId: inviteeId,
        subject: input.code,
        data: { linkId: input.code },
      });

      // Find inviter via link-created event
      const events = await ctx.db.query.Event.findMany({
        where: (t, { eq, and }) =>
          and(eq(t.type, "link-created"), eq(t.subject, input.code)),
      });
      const creatorId = events[0]?.actorId;
      if (!creatorId) return { success: true };

      // Create mutual contact link
      const [userA, userB] = [creatorId, inviteeId];
      if (userA === userB) return { success: true };
      await Promise.all([
        saveEventWithAnalytics(ctx.db, {
          type: "contact-linked",
          actorId: userA,
          subject: userA,
          data: { userA, userB, source: "invite-link" },
        }),
        saveEventWithAnalytics(ctx.db, {
          type: "contact-linked",
          actorId: userB,
          subject: userB,
          data: { userA, userB, source: "invite-link" },
        }),
      ]);
      return { success: true };
    }),
  // Track preview requests (e.g., WhatsApp, Facebook crawlers)
  preview: publicProcedure
    .input(
      z.object({
        code: z.string(),
        userAgent: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "link-preview-requested",
        subject: input.code,
        data: { linkId: input.code, userAgent: input.userAgent ?? "" },
      });
      return { success: true };
    }),
});
