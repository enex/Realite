import { NextResponse } from "next/server";

import { syncPublicEventsFromGoogleCalendar } from "@/src/lib/google-calendar";
import { generateSuggestions } from "@/src/lib/matcher";
import { listSuggestionsForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

function serializeSuggestion(
  suggestion: Awaited<ReturnType<typeof listSuggestionsForUser>>[number]
) {
  return {
    ...suggestion,
    startsAt: suggestion.startsAt.toISOString(),
    endsAt: suggestion.endsAt.toISOString(),
    createdAt: suggestion.createdAt.toISOString()
  };
}

export async function POST() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  try {
    await syncPublicEventsFromGoogleCalendar(user.id);
  } catch {
    // Matching läuft auch ohne frischen Sync weiter.
  }

  await generateSuggestions(user.id);
  const suggestions = await listSuggestionsForUser(user.id);

  return NextResponse.json({
    suggestions: suggestions.map((suggestion) => serializeSuggestion(suggestion))
  });
}
