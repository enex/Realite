import { NextResponse } from "next/server";
import { z } from "zod";

import {
  insertSuggestionIntoCalendar,
  removeSuggestionCalendarEvent,
  syncSuggestionDecisionInCalendar
} from "@/src/lib/google-calendar";
import {
  applyDecisionFeedback,
  clearSuggestionCalendarEventRef,
  getUserSuggestionSettings,
  setSuggestionCalendarEventRef
} from "@/src/lib/repository";
import { DECLINE_REASON_VALUES } from "@/src/lib/suggestion-feedback";
import { requireAppUser } from "@/src/lib/session";

const decisionSchema = z.object({
  decision: z.enum(["accepted", "declined"]),
  reasons: z.array(z.enum(DECLINE_REASON_VALUES)).max(5).optional(),
  note: z.string().max(300).optional().nullable()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ suggestionId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = decisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Entscheidung" }, { status: 400 });
  }

  const { suggestionId } = await context.params;

  try {
    const suggestion = await applyDecisionFeedback({
      userId: user.id,
      suggestionId,
      decision: parsed.data.decision,
      reasons: parsed.data.reasons,
      note: parsed.data.note
    });

    const settings = await getUserSuggestionSettings(user.id);
    let calendarEventRef = suggestion.calendarEventId;

    if (parsed.data.decision === "accepted" && !calendarEventRef) {
      const insertedEventRef = await insertSuggestionIntoCalendar({
        userId: user.id,
        suggestionId: suggestion.id,
        eventId: suggestion.eventId,
        title: suggestion.title,
        description: suggestion.description,
        location: suggestion.location,
        startsAt: suggestion.startsAt,
        endsAt: suggestion.endsAt,
        calendarId: settings.suggestionCalendarId,
        linkType: "event"
      });

      if (insertedEventRef) {
        calendarEventRef = insertedEventRef;
        await setSuggestionCalendarEventRef({
          suggestionId: suggestion.id,
          calendarEventId: insertedEventRef
        });
      }
    }

    if (parsed.data.decision === "declined" && calendarEventRef) {
      const removed = await removeSuggestionCalendarEvent({
        userId: user.id,
        calendarEventRef,
        preferredCalendarId: settings.suggestionCalendarId
      });
      if (removed) {
        await clearSuggestionCalendarEventRef(suggestion.id);
        calendarEventRef = null;
      }
    }

    if (calendarEventRef) {
      await syncSuggestionDecisionInCalendar({
        userId: user.id,
        calendarEventRef,
        decision: parsed.data.decision
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
