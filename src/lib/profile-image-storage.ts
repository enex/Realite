import {
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

/** OVH Object Storage expects the DC slug in SigV4 (e.g. sbg), not "auto". */
function ovhSigningRegionFromEndpoint(endpoint: string | undefined) {
  if (!endpoint) {
    return undefined;
  }
  try {
    const host = new URL(endpoint).hostname;
    const match = /^s3\.([a-z0-9-]+)\.io\.cloud\.ovh\.net$/i.exec(host);
    return match?.[1].toLowerCase();
  } catch {
    return undefined;
  }
}

export function resolveS3SigningRegion(
  endpoint: string | undefined,
  regionEnv: string | undefined,
) {
  const fromEnv = regionEnv?.trim();
  const ovh = ovhSigningRegionFromEndpoint(endpoint);
  if (ovh && (!fromEnv || fromEnv === "auto")) {
    return ovh;
  }
  return fromEnv || "auto";
}

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = requiredEnv("S3_ACCESS_KEY");
  const secretAccessKey = requiredEnv("S3_SECRET_KEY");

  return new S3Client({
    region: resolveS3SigningRegion(endpoint, process.env.S3_REGION),
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

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(
    /\/+$/,
    "",
  );
  if (
    publicBaseUrl &&
    value.startsWith(`${publicBaseUrl}/${PROFILE_IMAGE_PATH_PREFIX}/`)
  ) {
    return true;
  }

  return value.includes(`/${PROFILE_IMAGE_PATH_PREFIX}/`);
}

/** Strip query params from stored Realite URLs (e.g. AWS SigV4) before persisting. */
export function canonicalizeProfileImageUrlForPersistence(
  url: string | null | undefined,
): string | null {
  if (url == null || url === "") {
    return null;
  }
  if (!isStoredProfileImageUrl(url)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export function extractProfileImageStorageKey(fullUrl: string): string | null {
  try {
    const pathname = new URL(fullUrl).pathname;
    const needle = `/${PROFILE_IMAGE_PATH_PREFIX}/`;
    const idx = pathname.indexOf(needle);
    if (idx === -1) {
      return null;
    }
    return pathname.slice(idx + 1);
  } catch {
    return null;
  }
}

const PROFILE_IMAGE_PRESIGNED_DEFAULT_TTL_SECONDS = 604800;

export function profileImageReadUsesSignedUrl(): boolean {
  return process.env.S3_PROFILE_IMAGE_READ_SIGNED_URL?.trim().toLowerCase() !== "false";
}

function profileImagePresignedTtlSeconds() {
  const parsed = Number(process.env.S3_PROFILE_IMAGE_PRESIGNED_TTL_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return PROFILE_IMAGE_PRESIGNED_DEFAULT_TTL_SECONDS;
  }
  return Math.min(Math.floor(parsed), PROFILE_IMAGE_PRESIGNED_DEFAULT_TTL_SECONDS);
}

export async function resolveProfileImageReadUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (url == null || url === "") {
    return null;
  }
  if (!isStoredProfileImageUrl(url)) {
    return url;
  }
  if (!profileImageReadUsesSignedUrl()) {
    return url;
  }

  const canonical = canonicalizeProfileImageUrlForPersistence(url)!;
  const key = extractProfileImageStorageKey(canonical);
  if (!key) {
    return canonical;
  }

  const bucket = requiredEnv("S3_BUCKET");
  const client = getS3Client();
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, cmd, {
    expiresIn: profileImagePresignedTtlSeconds(),
  });
}

export async function mapResolveProfileImageField<
  T extends { image: string | null },
>(row: T): Promise<T> {
  return {
    ...row,
    image: await resolveProfileImageReadUrl(row.image),
  };
}

export async function uploadProfileImage(input: ProfileImageUpload) {
  const bucket = requiredEnv("S3_BUCKET");
  const client = getS3Client();

  const usePublicAcl =
    process.env.S3_PROFILE_IMAGE_OBJECT_ACL_PUBLIC_READ?.trim().toLowerCase() === "true";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
      ...(usePublicAcl ? { ACL: ObjectCannedACL.public_read } : {}),
    }),
  );

  return `${getPublicBaseUrl()}/${input.key}`;
}

export type ListedProfileImageObject = {
  key: string;
  lastModified: Date | undefined;
};

/** Lists object keys under the `profiles/` prefix (paginated). */
export async function listAllStoredProfileImageObjects(): Promise<
  ListedProfileImageObject[]
> {
  const bucket = requiredEnv("S3_BUCKET");
  const client = getS3Client();
  const prefix = `${PROFILE_IMAGE_PATH_PREFIX}/`;
  const out: ListedProfileImageObject[] = [];
  let continuationToken: string | undefined;
  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of resp.Contents ?? []) {
      if (obj.Key) {
        out.push({ key: obj.Key, lastModified: obj.LastModified });
      }
    }
    continuationToken = resp.IsTruncated
      ? resp.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return out;
}

/** Public object URL for a storage key, matching `uploadProfileImage` return shape. */
export function buildProfileImagePublicUrlForKey(storageKey: string): string {
  const trimmed = storageKey.replace(/^\/+/, "");
  return `${getPublicBaseUrl()}/${trimmed}`;
}

/**
 * Parses `profiles/<userId>/<file>` keys produced by the profile image upload API.
 * Returns null for unknown layouts (other prefixes, nested paths, invalid UUID).
 */
export function parseProfileImageUserObjectKey(key: string): {
  userId: string;
  fileName: string;
} | null {
  const parts = key.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== PROFILE_IMAGE_PATH_PREFIX) {
    return null;
  }
  const userId = parts[1]!;
  const fileName = parts[2]!;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    return null;
  }
  if (!/\.(jpe?g|png|webp)$/i.test(fileName)) {
    return null;
  }
  return { userId, fileName };
}
