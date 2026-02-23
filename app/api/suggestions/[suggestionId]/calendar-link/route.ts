import { NextResponse } from "next/server";

import { getCalendarEventWebUrl } from "@/src/lib/google-calendar";
import { getSuggestionForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ suggestionId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { suggestionId } = await context.params;
  const suggestion = await getSuggestionForUser(suggestionId, user.id);
  if (!suggestion?.calendarEventId?.trim()) {
    return NextResponse.json(
      { error: "Kein Kalendertermin für diesen Vorschlag" },
      { status: 404 }
    );
  }

  const url = await getCalendarEventWebUrl({
    userId: user.id,
    calendarEventRef: suggestion.calendarEventId
  });

  return NextResponse.redirect(url);
}
