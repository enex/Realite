import {
  Gender,
  genderSchema,
  relationshipStatusSchema,
} from "@/shared/validation";
import { pick } from "radash";
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
        .object({ id: z.uuid() })
        .or(z.object({ phoneNumberHash: z.string().uuid() }))
    )
    .errors({
      NOT_FOUND: { message: "User not found" },
    })
    .handler(async ({ context, input, errors }) => {
      let id = "id" in input ? input.id : null;
      if ("phoneNumberHash" in input) {
        id = await context.es.projections.auth.getUserIdByPhoneNumber(
          input.phoneNumberHash
        );
      }
      if (!id) throw errors.NOT_FOUND();
      const user = await context.es.projections.user.getProfile(id);
      if (!user) throw errors.NOT_FOUND();
      return pick(user, [
        "id",
        "name",
        "image",
        "gender",
        "birthDate",
        "relationshipStatus",
      ]);
    }),
};
