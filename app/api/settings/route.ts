import { NextResponse } from "next/server";
import { z } from "zod";

import { listReadableCalendars, listWritableCalendars } from "@/src/lib/google-calendar";
import {
  getAutoInsertedSuggestionCountForUser,
  getGoogleConnection,
  getSuggestionLearningSummary,
  getUserSuggestionSettings,
  updateUserSuggestionSettings
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const updateSettingsSchema = z.object({
  autoInsertSuggestions: z.boolean(),
  suggestionCalendarId: z.string().min(1).max(200),
  suggestionDeliveryMode: z.enum(["calendar_copy", "source_invite"]),
  shareEmailInSourceInvites: z.boolean(),
  matchingCalendarIds: z.array(z.string().min(1).max(200)).max(250),
  blockedCreatorIds: z.array(z.string().uuid()).max(500),
  blockedActivityTags: z.array(z.string().min(2).max(80)).max(500),
  suggestionLimitPerDay: z.number().int().min(1).max(50),
  suggestionLimitPerWeek: z.number().int().min(1).max(200)
});

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const [storedSettings, calendars, readableCalendars, connection, autoInsertedSuggestionCount] = await Promise.all([
    getUserSuggestionSettings(user.id),
    listWritableCalendars(user.id),
    listReadableCalendars(user.id),
    getGoogleConnection(user.id),
    getAutoInsertedSuggestionCountForUser(user.id)
  ]);

  let settings = storedSettings;
  const preferredCalendarExists = calendars.some((calendar) => calendar.id === settings.suggestionCalendarId);

  if (calendars.length > 0 && !preferredCalendarExists) {
    const fallbackCalendarId = calendars[0]?.id ?? "primary";
    settings = await updateUserSuggestionSettings({
      userId: user.id,
      autoInsertSuggestions: settings.autoInsertSuggestions,
      suggestionCalendarId: fallbackCalendarId,
      suggestionDeliveryMode: settings.suggestionDeliveryMode,
      shareEmailInSourceInvites: settings.shareEmailInSourceInvites,
      matchingCalendarIds: settings.matchingCalendarIds,
      blockedCreatorIds: settings.blockedCreatorIds,
      blockedActivityTags: settings.blockedActivityTags,
      suggestionLimitPerDay: settings.suggestionLimitPerDay,
      suggestionLimitPerWeek: settings.suggestionLimitPerWeek
    });
  }

  const readableIds = new Set(readableCalendars.map((calendar) => calendar.id));
  const filteredMatchingIds = settings.matchingCalendarIds.filter((id) => readableIds.has(id));
  if (filteredMatchingIds.length !== settings.matchingCalendarIds.length) {
    settings = await updateUserSuggestionSettings({
      userId: user.id,
      autoInsertSuggestions: settings.autoInsertSuggestions,
      suggestionCalendarId: settings.suggestionCalendarId,
      suggestionDeliveryMode: settings.suggestionDeliveryMode,
      shareEmailInSourceInvites: settings.shareEmailInSourceInvites,
      matchingCalendarIds: filteredMatchingIds,
      blockedCreatorIds: settings.blockedCreatorIds,
      blockedActivityTags: settings.blockedActivityTags,
      suggestionLimitPerDay: settings.suggestionLimitPerDay,
      suggestionLimitPerWeek: settings.suggestionLimitPerWeek
    });
  }

  if (settings.suggestionDeliveryMode !== "calendar_copy" || settings.shareEmailInSourceInvites) {
    settings = await updateUserSuggestionSettings({
      userId: user.id,
      autoInsertSuggestions: settings.autoInsertSuggestions,
      suggestionCalendarId: settings.suggestionCalendarId,
      suggestionDeliveryMode: "calendar_copy",
      shareEmailInSourceInvites: false,
      matchingCalendarIds: settings.matchingCalendarIds,
      blockedCreatorIds: settings.blockedCreatorIds,
      blockedActivityTags: settings.blockedActivityTags,
      suggestionLimitPerDay: settings.suggestionLimitPerDay,
      suggestionLimitPerWeek: settings.suggestionLimitPerWeek
    });
  }

  const criteria = await getSuggestionLearningSummary(user.id);

  return NextResponse.json({
    settings,
    criteria,
    suggestionStats: {
      autoInsertedSuggestionCount
    },
    calendars,
    readableCalendars,
    calendarConnected: Boolean(connection)
  });
}

export async function PATCH(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Einstellungen" }, { status: 400 });
  }

  if (parsed.data.suggestionLimitPerWeek < parsed.data.suggestionLimitPerDay) {
    return NextResponse.json(
      { error: "Das Wochenlimit muss mindestens so hoch sein wie das Tageslimit." },
      { status: 400 }
    );
  }

  const [calendars, readableCalendars] = await Promise.all([
    listWritableCalendars(user.id),
    listReadableCalendars(user.id)
  ]);
  const selectedCalendarId = parsed.data.suggestionCalendarId.trim();
  const isKnownCalendar = calendars.some((calendar) => calendar.id === selectedCalendarId);
  let finalCalendarId = selectedCalendarId;

  if (calendars.length === 0) {
    finalCalendarId = "primary";
  } else if (!isKnownCalendar) {
    return NextResponse.json(
      { error: "Der ausgewählte Kalender ist nicht verfügbar oder nicht beschreibbar." },
      { status: 400 }
    );
  }

  const readableCalendarIds = new Set(readableCalendars.map((calendar) => calendar.id));
  const normalizedMatchingIds = Array.from(
    new Set(parsed.data.matchingCalendarIds.map((id) => id.trim()).filter(Boolean))
  );
  const normalizedBlockedCreatorIds = Array.from(
    new Set(parsed.data.blockedCreatorIds.map((id) => id.trim()).filter(Boolean))
  );
  const normalizedBlockedActivityTags = Array.from(
    new Set(
      parsed.data.blockedActivityTags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.startsWith("#"))
        .filter(Boolean)
    )
  );
  const hasUnknownMatchingCalendar = normalizedMatchingIds.some((id) => !readableCalendarIds.has(id));
  if (hasUnknownMatchingCalendar) {
    return NextResponse.json(
      { error: "Mindestens ein ausgewählter Matching-Kalender ist nicht lesbar oder nicht mehr verfügbar." },
      { status: 400 }
    );
  }

  const settings = await updateUserSuggestionSettings({
    userId: user.id,
    autoInsertSuggestions: parsed.data.autoInsertSuggestions,
    suggestionCalendarId: finalCalendarId,
    suggestionDeliveryMode: "calendar_copy",
    shareEmailInSourceInvites: false,
    matchingCalendarIds: normalizedMatchingIds,
    blockedCreatorIds: normalizedBlockedCreatorIds,
    blockedActivityTags: normalizedBlockedActivityTags,
    suggestionLimitPerDay: parsed.data.suggestionLimitPerDay,
    suggestionLimitPerWeek: parsed.data.suggestionLimitPerWeek
  });

  const [autoInsertedSuggestionCount, criteria] = await Promise.all([
    getAutoInsertedSuggestionCountForUser(user.id),
    getSuggestionLearningSummary(user.id)
  ]);

  return NextResponse.json({
    settings,
    criteria,
    suggestionStats: {
      autoInsertedSuggestionCount
    },
    calendars,
    readableCalendars
  });
}
