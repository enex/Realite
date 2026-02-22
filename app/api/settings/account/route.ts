import { splitSetCookieHeader } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { authUser } from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import { getAuth, getAuthSession } from "@/src/lib/auth";
import { removeSuggestionCalendarEvent } from "@/src/lib/google-calendar";
import {
  deleteGroupContactsByEmail,
  deleteUserById,
  getUserByEmail,
  getUserSuggestionSettings,
  listSuggestionCalendarRefsForUser
} from "@/src/lib/repository";

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  const authUserId = session?.user.id?.trim();
  const email = session?.user.email?.trim();

  if (!authUserId || !email) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  try {
    const user = await getUserByEmail(email);

    if (user) {
      const [settings, calendarRefs] = await Promise.all([
        getUserSuggestionSettings(user.id),
        listSuggestionCalendarRefsForUser(user.id)
      ]);

      const uniqueCalendarRefs = Array.from(new Set(calendarRefs));
      const failedRemovals = [] as string[];

      for (const calendarEventRef of uniqueCalendarRefs) {
        try {
          const removed = await removeSuggestionCalendarEvent({
            userId: user.id,
            calendarEventRef,
            preferredCalendarId: settings.suggestionCalendarId
          });

          if (!removed) {
            failedRemovals.push(calendarEventRef);
          }
        } catch (error) {
          console.error("Kalendereintrag konnte vor Account-Löschung nicht entfernt werden", {
            calendarEventRef,
            error: error instanceof Error ? error.message : error
          });
          failedRemovals.push(calendarEventRef);
        }
      }

      if (failedRemovals.length > 0) {
        return NextResponse.json(
          {
            error:
              "Nicht alle von Realite angelegten Kalendereinträge konnten entfernt werden. Bitte Kalenderzugriff prüfen und erneut versuchen."
          },
          { status: 409 }
        );
      }
    }

    const auth = getAuth();
    const signOutResponse = await auth.api.signOut({
      headers: new Headers(request.headers),
      asResponse: true
    });

    if (user) {
      await deleteUserById(user.id);
    }

    await deleteGroupContactsByEmail(email);

    const db = getDb();
    await db.delete(authUser).where(eq(authUser.id, authUserId));

    const response = NextResponse.json({ ok: true });
    const setCookieHeader = signOutResponse.headers.get("set-cookie");

    if (setCookieHeader) {
      for (const value of splitSetCookieHeader(setCookieHeader)) {
        response.headers.append("set-cookie", value);
      }
    }

    return response;
  } catch (error) {
    console.error("Account konnte nicht gelöscht werden", error);
    return NextResponse.json(
      { error: "Account konnte nicht gelöscht werden. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }
}
