import { NextResponse } from "next/server";
import { z } from "zod";

import { syncSuggestionDecisionInCalendar } from "@/src/lib/google-calendar";
import { applyDecisionFeedback } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const decisionSchema = z.object({
  decision: z.enum(["accepted", "declined"])
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
      decision: parsed.data.decision
    });

    if (suggestion.calendarEventId) {
      await syncSuggestionDecisionInCalendar({
        userId: user.id,
        calendarEventRef: suggestion.calendarEventId,
        decision: parsed.data.decision
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
