import { inArray } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  buildProfileImagePublicUrlForKey,
  canonicalizeProfileImageUrlForPersistence,
  extractProfileImageStorageKey,
  isStoredProfileImageUrl,
  listAllStoredProfileImageObjects,
  parseProfileImageUserObjectKey,
} from "@/src/lib/profile-image-storage";
import { updateUserProfileImage } from "@/src/lib/repository";

export type ReconcileProfileUploadsResult = {
  dryRun: boolean;
  userCountWithUploads: number;
  updated: Array<{
    userId: string;
    from: string | null;
    to: string;
    chosenKey: string;
  }>;
  skipped: Array<{ userId: string; reason: string }>;
  ignoredKeys: number;
};

/**
 * Links Realite profile images in object storage to `users.image` when uploads
 * exist under `profiles/<userId>/` but the DB was never updated (e.g. before
 * upload+DB persistence was fixed). For each user with such objects, picks the
 * newest file by LastModified. Skips users whose `users.image` already points
 * at one of the listed objects for that user.
 */
export async function reconcileOrphanedProfileImages(input: {
  dryRun: boolean;
}): Promise<ReconcileProfileUploadsResult> {
  const listed = await listAllStoredProfileImageObjects();
  const byUser = new Map<
    string,
    Array<{ key: string; lastModified: number }>
  >();

  let ignoredKeys = 0;
  for (const { key, lastModified } of listed) {
    const parsed = parseProfileImageUserObjectKey(key);
    if (!parsed) {
      ignoredKeys += 1;
      continue;
    }
    const ts = lastModified?.getTime() ?? 0;
    const arr = byUser.get(parsed.userId) ?? [];
    arr.push({ key, lastModified: ts });
    byUser.set(parsed.userId, arr);
  }

  const userIds = [...byUser.keys()];
  if (userIds.length === 0) {
    return {
      dryRun: input.dryRun,
      userCountWithUploads: 0,
      updated: [],
      skipped: [],
      ignoredKeys,
    };
  }

  const db = getDb();
  const rows = await db
    .select({ id: users.id, image: users.image })
    .from(users)
    .where(inArray(users.id, userIds));

  const imageByUserId = new Map(rows.map((r) => [r.id, r.image]));

  const updated: ReconcileProfileUploadsResult["updated"] = [];
  const skipped: ReconcileProfileUploadsResult["skipped"] = [];

  for (const userId of userIds.sort()) {
    const objects = byUser.get(userId)!;
    objects.sort((a, b) => b.lastModified - a.lastModified);
    const chosen = objects[0]!;
    const publicUrl = buildProfileImagePublicUrlForKey(chosen.key);
    const toPersist =
      canonicalizeProfileImageUrlForPersistence(publicUrl) ?? publicUrl;

    const currentImage = imageByUserId.get(userId);
    if (currentImage === undefined) {
      skipped.push({ userId, reason: "user_not_found" });
      continue;
    }

    const listedKeys = new Set(objects.map((o) => o.key));
    if (currentImage && isStoredProfileImageUrl(currentImage)) {
      const canon =
        canonicalizeProfileImageUrlForPersistence(currentImage) ?? currentImage;
      const existingKey = extractProfileImageStorageKey(canon);
      if (existingKey && listedKeys.has(existingKey)) {
        skipped.push({ userId, reason: "already_linked_to_listed_object" });
        continue;
      }
    }

    if (!input.dryRun) {
      await updateUserProfileImage({ userId, image: toPersist });
    }
    updated.push({
      userId,
      from: currentImage,
      to: toPersist,
      chosenKey: chosen.key,
    });
  }

  return {
    dryRun: input.dryRun,
    userCountWithUploads: byUser.size,
    updated,
    skipped,
    ignoredKeys,
  };
}
