import { genderSchema, relationshipStatusSchema } from "@/shared/validation";
import { pick } from "radash";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { protectedRoute } from "../orpc";
import { createPresignedPutUrl } from "../utils/s3";

const updateUserInputSchema = z.object({
  gender: genderSchema.optional(),
  name: z.string().optional(),
  image: z.string().optional(),
  birthDate: z.string().optional(),
  relationshipStatus: relationshipStatusSchema.optional(),
  privacySettings: z
    .object({
      showGender: z.boolean().optional(),
      showAge: z.boolean().optional(),
      showRelationshipStatus: z.boolean().optional(),
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
  getAvatarUploadUrl: protectedRoute
    .input(
      z.object({
        contentType: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const bucket = process.env.S3_BUCKET;
      const region = process.env.S3_REGION;
      const accessKeyId = process.env.S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
      const endpoint = process.env.S3_ENDPOINT;
      const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

      if (!bucket || !region || !accessKeyId || !secretAccessKey) {
        throw new Error(
          "S3 env missing: set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
        );
      }

      const extension =
        input.contentType === "image/png"
          ? "png"
          : input.contentType === "image/webp"
            ? "webp"
            : "jpg";
      const key = `avatars/${context.session.id}/${randomUUID()}.${extension}`;

      return createPresignedPutUrl({
        accessKeyId,
        secretAccessKey,
        region,
        bucket,
        key,
        expiresSeconds: 60 * 5,
        endpoint: endpoint || undefined,
        publicBaseUrl: publicBaseUrl || undefined,
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
  get: protectedRoute
    .input(
      z
        .object({ id: z.uuid() })
        .or(z.object({ phoneNumberHash: z.string().uuid() })),
    )
    .errors({
      NOT_FOUND: { message: "User not found" },
    })
    .handler(async ({ context, input, errors }) => {
      let id = "id" in input ? input.id : null;
      if ("phoneNumberHash" in input) {
        id = await context.es.projections.auth.getUserIdByPhoneNumber(
          input.phoneNumberHash,
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
  getMany: protectedRoute
    .input(z.object({ ids: z.array(z.uuid()).min(1) }))
    .handler(async ({ context, input }) => {
      const profiles = await Promise.all(
        input.ids.map(async (id) => {
          const u = await context.es.projections.user.getProfile(id);
          if (!u) return null;
          return pick(u, [
            "id",
            "name",
            "image",
            "gender",
            "birthDate",
            "relationshipStatus",
          ]);
        }),
      );
      return profiles.filter(Boolean);
    }),
};
