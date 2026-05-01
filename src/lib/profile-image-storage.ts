import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const PROFILE_IMAGE_PATH_PREFIX = "profiles";

export type ProfileImageUpload = {
  key: string;
  contentType: string;
  body: Buffer;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} ist nicht konfiguriert.`);
  }
  return value;
}

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");

  return new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getPublicBaseUrl() {
  const explicitBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const bucket = requiredEnv("S3_BUCKET");
  const endpoint = process.env.S3_ENDPOINT?.trim()?.replace(/\/+$/, "");
  if (endpoint) {
    return `${endpoint}/${bucket}`;
  }

  const region = process.env.S3_REGION?.trim() || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

export function isStoredProfileImageUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, "");
  if (publicBaseUrl && value.startsWith(`${publicBaseUrl}/${PROFILE_IMAGE_PATH_PREFIX}/`)) {
    return true;
  }

  return value.includes(`/${PROFILE_IMAGE_PATH_PREFIX}/`);
}

export async function uploadProfileImage(input: ProfileImageUpload) {
  const bucket = requiredEnv("S3_BUCKET");
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${getPublicBaseUrl()}/${input.key}`;
}
