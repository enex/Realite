import { and, desc, eq } from "drizzle-orm";

import { authAccount, authUser } from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import { getAuthSession } from "@/src/lib/auth";
import {
  ensureAlleGroupForUser,
  ensureKontakteGroupForUser,
  ensureUserDatingProfile,
  ensureUserSuggestionSettings,
  getUserById,
  getGoogleConnection,
  upsertGoogleConnection,
  upsertUser,
} from "@/src/lib/repository";
import {
  hasRequiredCalendarScopes,
  hasRequiredContactsScopes,
} from "@/src/lib/provider-adapters";

async function syncGoogleConnectionFromAuthAccount(input: {
  authUserId: string;
  appUserId: string;
}) {
  const db = getDb();
  const [googleAccount] = await db
    .select({
      accessToken: authAccount.accessToken,
      refreshToken: authAccount.refreshToken,
      accessTokenExpiresAt: authAccount.accessTokenExpiresAt,
      scope: authAccount.scope,
    })
    .from(authAccount)
    .where(
      and(
        eq(authAccount.userId, input.authUserId),
        eq(authAccount.providerId, "google"),
      ),
    )
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

  const newScope = googleAccount.scope;
  const newScopeHasExtended =
    hasRequiredCalendarScopes(newScope, "google") ||
    hasRequiredContactsScopes(newScope);

  // Schutzmechanismus: Wenn der neue Token nur minimale Login-Scopes hat,
  // darf er die bestehende Kalender/Kontakte-Verbindung nicht überschreiben.
  // Das verhindert, dass ein Re-Login den Kalender-Zugriff entfernt, den der
  // Nutzer zuvor über den separaten Connect-Flow erteilt hat.
  if (!newScopeHasExtended) {
    const existingConnection = await getGoogleConnection(input.appUserId);
    const existingHasExtended =
      existingConnection &&
      (hasRequiredCalendarScopes(existingConnection.scope, "google") ||
        hasRequiredContactsScopes(existingConnection.scope));

    if (existingHasExtended) {
      // Nur Access-Token und Ablaufzeit aktualisieren, Scope und Refresh-Token beibehalten
      await upsertGoogleConnection({
        userId: input.appUserId,
        accessToken: googleAccount.accessToken,
        refreshToken: existingConnection.refreshToken,
        expiresAt:
          parsedTokenExpiry && !Number.isNaN(parsedTokenExpiry.getTime())
            ? Math.floor(parsedTokenExpiry.getTime() / 1000)
            : null,
        scope: existingConnection.scope,
      });
      return;
    }
  }

  await upsertGoogleConnection({
    userId: input.appUserId,
    accessToken: googleAccount.accessToken,
    refreshToken: googleAccount.refreshToken,
    expiresAt:
      parsedTokenExpiry && !Number.isNaN(parsedTokenExpiry.getTime())
        ? Math.floor(parsedTokenExpiry.getTime() / 1000)
        : null,
    scope: newScope,
  });
}

async function ensureAppUserReady(input: {
  appUserId: string;
  authUserId?: string;
}) {
  await Promise.all([
    ensureAlleGroupForUser(input.appUserId),
    ensureKontakteGroupForUser(input.appUserId),
    ensureUserDatingProfile(input.appUserId),
    ensureUserSuggestionSettings(input.appUserId),
    input.authUserId
      ? syncGoogleConnectionFromAuthAccount({
          authUserId: input.authUserId,
          appUserId: input.appUserId,
        })
      : Promise.resolve(),
  ]);
}

async function getOrCreateAppUserFromIdentity(input: {
  authUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const user = await upsertUser({
    email: input.email,
    name: input.name,
    image: input.image,
  });

  await ensureAppUserReady({
    appUserId: user.id,
    authUserId: input.authUserId,
  });

  return user;
}

export async function requireAppUserFromAuthUserId(authUserId: string) {
  const db = getDb();
  const [userRecord] = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      image: authUser.image,
    })
    .from(authUser)
    .where(eq(authUser.id, authUserId))
    .limit(1);

  if (!userRecord?.email) {
    return null;
  }

  return getOrCreateAppUserFromIdentity({
    authUserId: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    image: userRecord.image,
  });
}

export async function requireExistingAppUser(userId: string) {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  await ensureAppUserReady({
    appUserId: user.id,
  });

  return user;
}

export async function requireAppUser() {
  const session = await getAuthSession();
  const email = session?.user.email;
  const authUserId = session?.user.id;

  if (!email || !authUserId) {
    return null;
  }

  return getOrCreateAppUserFromIdentity({
    authUserId,
    email,
    name: session.user.name,
    image: session.user.image,
  });
}
