import { and, desc, eq } from "drizzle-orm";

import { authAccount } from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import { getAuthSession } from "@/src/lib/auth";
import {
  ensureAlleGroupForUser,
  ensureKontakteGroupForUser,
  ensureUserDatingProfile,
  ensureUserSuggestionSettings,
  upsertGoogleConnection,
  upsertUser
} from "@/src/lib/repository";

async function syncGoogleConnectionFromAuthAccount(input: { authUserId: string; appUserId: string }) {
  const db = getDb();
  const [googleAccount] = await db
    .select({
      accessToken: authAccount.accessToken,
      refreshToken: authAccount.refreshToken,
      accessTokenExpiresAt: authAccount.accessTokenExpiresAt,
      scope: authAccount.scope
    })
    .from(authAccount)
    .where(and(eq(authAccount.userId, input.authUserId), eq(authAccount.providerId, "google")))
    .orderBy(desc(authAccount.updatedAt))
    .limit(1);

  if (!googleAccount?.accessToken) {
    return;
  }

  const parsedTokenExpiry =
    googleAccount.accessTokenExpiresAt instanceof Date
      ? googleAccount.accessTokenExpiresAt
      : googleAccount.accessTokenExpiresAt
        ? new Date(googleAccount.accessTokenExpiresAt)
        : null;

  await upsertGoogleConnection({
    userId: input.appUserId,
    accessToken: googleAccount.accessToken,
    refreshToken: googleAccount.refreshToken,
    expiresAt: parsedTokenExpiry && !Number.isNaN(parsedTokenExpiry.getTime())
      ? Math.floor(parsedTokenExpiry.getTime() / 1000)
      : null,
    scope: googleAccount.scope
  });
}

export async function requireAppUser() {
  const session = await getAuthSession();
  const email = session?.user.email;

  if (!email) {
    return null;
  }

  const user = await upsertUser({
    email,
    name: session.user.name,
    image: session.user.image
  });

  await ensureAlleGroupForUser(user.id);
  await ensureKontakteGroupForUser(user.id);
  await ensureUserDatingProfile(user.id);
  await ensureUserSuggestionSettings(user.id);
  await syncGoogleConnectionFromAuthAccount({
    authUserId: session.user.id,
    appUserId: user.id
  });

  return user;
}
