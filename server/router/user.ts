import {
  Gender,
  genderSchema,
  relationshipStatusSchema,
} from "@/shared/validation";
import { z } from "zod";
import { protectedRoute } from "../orpc";

const updateUserInputSchema = z.object({
  gender: genderSchema.optional(),
  name: z.string().optional(),
  birthDate: z.string().optional(),
  relationshipStatus: relationshipStatusSchema.optional(),
  privacySettings: z
    .object({
      showGender: z.boolean(),
      showAge: z.boolean(),
      showRelationshipStatus: z.boolean(),
    })
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const userRouter = {
  update: protectedRoute
    .input(updateUserInputSchema)
    .handler(async ({ context, input }) => {
      await context.es.add({
        type: "realite.profile.updated",
        subject: context.session.id,
        data: input,
      });
    }),
  completeOnboarding: protectedRoute.handler(async ({ context }) => {
    await context.es.add({
      type: "realite.user.onboarded",
      subject: context.session.id,
      data: {
        completedAt: new Date().toISOString(),
        version: 1,
      },
    });
  }),
  me: protectedRoute
    .errors({
      NOT_FOUND: { message: "User not found" },
    })
    .handler(async ({ context, errors }) => {
      const { id: userId } = context.session;
      return await context.es.reduce(
        { actor: userId, subject: userId },
        (acc, event) => {
          switch (event.type) {
            case "realite.user.registered":
              return { ...acc, ...event.data };
            case "realite.user.onboarded":
              return {
                ...acc,
                onboarding: {
                  completed: true,
                  completedAt: event.time,
                },
              };
            case "realite.profile.updated":
              return {
                ...acc,
                ...event.data,
              };
            default:
              return acc;
          }
        },
        {
          gender: undefined as Gender | undefined,
          birthDate: undefined as Date | string | undefined,
          image: undefined,
          onboarding: {
            completed: false,
            completedAt: undefined as Date | undefined,
          },
          privacySettings: {
            showGender: true,
            showAge: true,
            showRelationshipStatus: true,
          },
        }
      );
    }),
  get: protectedRoute
    .input(
      z
        .object({ id: z.string().uuid() })
        .or(z.object({ phoneNumberHash: z.string().uuid() }))
    )
    .handler(async ({ context, input }) => {
      const user = await context.db.query.User.findFirst({
        where:
          "phoneNumberHash" in input
            ? or(
                eq(User.phoneNumberHash, input.phoneNumberHash),
                exists(
                  db
                    .select()
                    .from(PhoneNumber)
                    .where(
                      and(
                        eq(User.id, PhoneNumber.userId),
                        eq(PhoneNumber.phoneNumberHash, input.phoneNumberHash)
                      )
                    )
                )
              )
            : eq(User.id, input.id),
        columns: {
          id: true,
          name: true,
          image: true,
          phoneNumberHash: true,
        },
        with: {
          phoneNumbers: { columns: { phoneNumberHash: true } },
        },
      });

      if (!user)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });

      const res = {
        gender: undefined,
        birthDate: undefined,
        ...user,
        phoneNumbers: user.phoneNumbers.map((v) => v.phoneNumberHash),
      };

      const events = await ctx.db.query.Event.findMany({
        where: eq(Event.actorId, user.id),
        orderBy: [asc(Event.time)],
      });

      for (const event of events) {
        switch (event.type) {
          case "user-profile-updated":
            Object.assign(res, event.data);
            break;
          case "user-registered":
            Object.assign(res, event.data);
            break;
        }
      }
      if (ctx.session.id === user.id) {
        return res;
      }
      return {
        gender: res.gender,
        name: res.name,
        image: res.image,
        phoneNumbers: res.phoneNumbers,
        phoneNumberHash: res.phoneNumberHash,
        id: res.id,
      };
    }),
};
