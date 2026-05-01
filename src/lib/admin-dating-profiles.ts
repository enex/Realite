import { desc, eq, sql as dsql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { datingProfiles, users } from "@/src/db/schema";

export async function listDatingProfilesForAdmin(input: { limit: number; offset: number }) {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, input.limit));
  const offset = Math.max(0, input.offset);

  const [{ total }] = await db
    .select({ total: dsql<number>`count(*)::int` })
    .from(datingProfiles);

  const rows = await db
    .select({
      userId: datingProfiles.userId,
      enabled: datingProfiles.enabled,
      birthYear: datingProfiles.birthYear,
      gender: datingProfiles.gender,
      isSingle: datingProfiles.isSingle,
      soughtGenders: datingProfiles.soughtGenders,
      soughtAgeMin: datingProfiles.soughtAgeMin,
      soughtAgeMax: datingProfiles.soughtAgeMax,
      soughtOnlySingles: datingProfiles.soughtOnlySingles,
      profileUpdatedAt: datingProfiles.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userCreatedAt: users.createdAt,
    })
    .from(datingProfiles)
    .innerJoin(users, eq(datingProfiles.userId, users.id))
    .orderBy(desc(datingProfiles.updatedAt))
    .limit(limit)
    .offset(offset);

  return { profiles: rows, total };
}
