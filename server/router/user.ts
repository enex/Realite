import { genderSchema, relationshipStatusSchema } from "@/shared/validation";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { pick } from "radash";
import { z } from "zod";
import { protectedRoute } from "../orpc";

// Helper function to create AWS Signature Version 4 for direct S3 upload
function createS3Signature(
  accessKeyId: string,
  secretAccessKey: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: Buffer
) {
  const urlObj = new URL(url);
  const host = urlObj.host;
  const path = urlObj.pathname;
  const region = "us-east-1"; // Default region
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  // Create canonical headers
  const canonicalHeaders = Object.entries({
    host,
    ...headers,
  })
    .map(([k, v]) => [k.toLowerCase(), v.trim()])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}\n`)
    .join("");

  const signedHeaders = Object.keys({
    host,
    ...headers,
  })
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");

  const payloadHash = createHash("sha256").update(payload).digest("hex");

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const getSigningKey = (secret: string, date: string, region: string) => {
    const kDate = createHmac("sha256", `AWS4${secret}`).update(date).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  };

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region);
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
}

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
  uploadAvatar: protectedRoute
    .input(
      z.object({
        // Note: We use dataUrl instead of z.file() due to an incompatibility
        // between Expo/React Native and oRPC's file handling. oRPC's FormData
        // serialization tries to set the 'name' property on File/Blob objects,
        // but Expo's polyfill only provides a getter, causing "Cannot assign to
        // property 'name' which has only a getter" errors. Using base64 data URLs
        // works reliably across all platforms (web, iOS, Android).
        dataUrl: z.string(),
        contentType: z.string().optional(),
      })
    )
    .errors({
      MISCONFIGURED: { message: "S3 is not configured on the server." },
      INVALID_IMAGE: { message: "Invalid image data." },
      TOO_LARGE: { message: "Image is too large." },
      UPLOAD_FAILED: { message: "Upload failed." },
    })
    .handler(async ({ context, input, errors }) => {
      // Simplified S3 configuration - only the 4 required env variables
      const bucket = process.env.S3_BUCKET;
      const accessKey = process.env.S3_ACCESS_KEY;
      const secretKey = process.env.S3_SECRET_KEY;
      const endpoint = process.env.S3_ENDPOINT;

      if (!bucket || !accessKey || !secretKey || !endpoint) {
        throw errors.MISCONFIGURED();
      }

      const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match?.[2]) throw errors.INVALID_IMAGE();
      const base64 = match[2];
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.length) throw errors.INVALID_IMAGE();
      if (bytes.length > 5 * 1024 * 1024) throw errors.TOO_LARGE();

      const contentType = input.contentType ?? match[1] ?? "image/jpeg";
      const extension =
        contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : "jpg";
      const key = `avatars/${context.session.id}/${randomUUID()}.${extension}`;

      // Build S3 URL - use virtual-hosted-style (bucket as subdomain)
      // e.g., https://realite.s3.sbg.io.cloud.ovh.net/avatars/...
      const endpointUrl = new URL(
        endpoint.startsWith("http://") || endpoint.startsWith("https://")
          ? endpoint
          : `https://${endpoint}`
      );
      const host = `${bucket}.${endpointUrl.host}`;
      const s3Url = `${endpointUrl.protocol}//${host}/${key}`;

      // Create AWS Signature Version 4 for direct upload
      // Include x-amz-acl header to make the object publicly readable
      const signatureHeaders = createS3Signature(
        accessKey,
        secretKey,
        "PUT",
        s3Url,
        {
          "content-type": contentType,
          "x-amz-acl": "public-read",
        },
        bytes
      );

      // Upload directly to S3 using fetch with AWS signature
      const res = await fetch(s3Url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "x-amz-acl": "public-read",
          ...signatureHeaders,
        },
        body: bytes,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error("S3 avatar upload failed", {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
        });
        throw errors.UPLOAD_FAILED();
      }

      // Construct public URL - use S3_PUBLIC_URL if provided, otherwise use the S3 endpoint URL
      const publicBaseUrl = process.env.S3_PUBLIC_URL;
      const publicUrl = publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, "")}/${key}`
        : s3Url;

      await context.es.add({
        type: "realite.profile.updated",
        subject: context.session.id,
        data: { image: publicUrl },
      });

      return { publicUrl };
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
        })
      );
      return profiles.filter(Boolean);
    }),
};
