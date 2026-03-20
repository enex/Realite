import { Buffer } from "node:buffer";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { buildDashboardPayload, buildDashboardRefreshPayload } from "@/src/lib/dashboard-data";
import { DATE_MIN_AGE } from "@/src/lib/dating";
import { EVENT_CATEGORY_VALUES, type EventCategory } from "@/src/lib/event-categories";
import {
  addAttendeeToSourceEvent,
  ensureCalendarWatchesForUser,
  getCalendarAttendeeResponses,
  getCalendarEventWebUrl,
  getGoogleAccessToken,
  getSourceEventAttendees,
  insertSuggestionIntoCalendar,
  listReadableCalendars,
  listWritableCalendars,
  removeSuggestionCalendarEvent,
  syncSuggestionDecisionInCalendar
} from "@/src/lib/google-calendar";
import { fetchOgImageFromText } from "@/src/lib/link-preview";
import {
  addMemberToGroupByEmail,
  applyDecisionFeedback,
  clearSuggestionCalendarEventRef,
  createEvent,
  createEventComment,
  createGroup,
  createInviteLink,
  deleteOrHideGroup,
  getDateHashtagStatus,
  getGoogleConnection,
  getSuggestionForUser,
  getSuggestionLearningSummary,
  getUserSuggestionSettings,
  getVisibleEventForUserById,
  getAutoInsertedSuggestionCountForUser,
  isGroupMember,
  joinGroupByToken,
  listEventComments,
  listGroupContactsForUser,
  listGroupsForUser,
  listSuggestionsForUser,
  listVisibleEventsForUser,
  RepositoryValidationError,
  setGroupHiddenState,
  setSuggestionCalendarEventRef,
  updateEventImageUrls,
  updateGroupHashtags,
  updateUserDatingProfile,
  updateUserSuggestionSettings
} from "@/src/lib/repository";
import { DECLINE_REASON_VALUES } from "@/src/lib/suggestion-feedback";
import { SmartMeetingValidationError, createSmartMeetingPlanWithInitialRun, listSmartMeetingsForUser, updateSmartMeetingPlan } from "@/src/lib/smart-meetings";
import { parseSmartMeetingShortcuts } from "@/src/lib/smart-meeting-shortcuts";

type McpUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

const currentYear = new Date().getUTCFullYear();
const MAX_COMMENT_BODY_LENGTH = 2000;
const INVITE_SUGGESTION_COUNT = 3;
const SEARCH_CANDIDATES_LIMIT = 10;

const createGroupSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(240).optional(),
  hashtags: z.array(z.string().max(40)).optional(),
  visibility: z.enum(["public", "private"]).default("private")
});

const updateGroupSchema = z
  .object({
    groupId: z.string().uuid(),
    hashtags: z.array(z.string().max(40)).optional(),
    isHidden: z.boolean().optional()
  })
  .refine((value) => (value.hashtags !== undefined) !== (value.isHidden !== undefined), {
    message: "Genau eines von hashtags oder isHidden muss gesetzt sein."
  });

const createEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  visibility: z.enum(["public", "group"]).default("public"),
  groupId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
  color: z.string().max(30).optional().nullable(),
  category: z.enum(EVENT_CATEGORY_VALUES as unknown as [string, ...string[]]).optional().nullable()
});

const updateSettingsSchema = z.object({
  autoInsertSuggestions: z.boolean(),
  suggestionCalendarId: z.string().min(1).max(200),
  suggestionDeliveryMode: z.enum(["calendar_copy", "source_invite"]).default("calendar_copy"),
  shareEmailInSourceInvites: z.boolean().default(false),
  matchingCalendarIds: z.array(z.string().min(1).max(200)).max(250),
  blockedCreatorIds: z.array(z.string().uuid()).max(500),
  blockedActivityTags: z.array(z.string().min(2).max(80)).max(500),
  suggestionLimitPerDay: z.number().int().min(1).max(50),
  suggestionLimitPerWeek: z.number().int().min(1).max(200)
});

const updateDatingSchema = z.object({
  enabled: z.boolean().optional(),
  birthYear: z.number().int().min(1900).max(currentYear).nullable().optional(),
  gender: z.enum(["woman", "man", "non_binary"]).nullable().optional(),
  isSingle: z.boolean().optional(),
  soughtGenders: z.array(z.enum(["woman", "man", "non_binary"])).max(3).optional(),
  soughtAgeMin: z.number().int().min(DATE_MIN_AGE).max(99).nullable().optional(),
  soughtAgeMax: z.number().int().min(DATE_MIN_AGE).max(99).nullable().optional(),
  soughtOnlySingles: z.boolean().optional()
});

const createSmartMeetingSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  groupId: z.string().uuid(),
  tags: z.array(z.string().max(40)).default([]),
  durationMinutes: z.number().int().min(15).max(1440),
  minAcceptedParticipants: z.number().int().min(1).max(50),
  responseWindowHours: z.number().int().min(1).max(14 * 24).optional(),
  searchWindowStart: z.string().datetime(),
  searchWindowEnd: z.string().datetime(),
  slotIntervalMinutes: z.number().int().min(15).max(180).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional()
});

const updateSmartMeetingSchema = createSmartMeetingSchema.partial().extend({
  planId: z.string().uuid()
});

const suggestionDecisionSchema = z.object({
  suggestionId: z.string().uuid(),
  decision: z.enum(["accepted", "declined"]),
  reasons: z.array(z.enum(DECLINE_REASON_VALUES)).max(5).optional(),
  note: z.string().max(300).optional().nullable()
});

function toText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function successResult<T>(payload: T) {
  return {
    content: [{ type: "text" as const, text: toText(payload) }]
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Unbekannter Fehler";
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }]
  };
}

function serializeEvent(
  event: Awaited<ReturnType<typeof listVisibleEventsForUser>>[number],
  isAvailable = true
) {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    isAvailable
  };
}

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

function serializeSettingsResponse(input: {
  settings: Awaited<ReturnType<typeof getUserSuggestionSettings>>;
  criteria: Awaited<ReturnType<typeof getSuggestionLearningSummary>>;
  autoInsertedSuggestionCount: number;
  calendars: Awaited<ReturnType<typeof listWritableCalendars>>;
  readableCalendars: Awaited<ReturnType<typeof listReadableCalendars>>;
  calendarConnected: boolean;
}) {
  return {
    settings: input.settings,
    criteria: input.criteria,
    suggestionStats: {
      autoInsertedSuggestionCount: input.autoInsertedSuggestionCount
    },
    calendars: input.calendars,
    readableCalendars: input.readableCalendars,
    calendarConnected: input.calendarConnected
  };
}

async function getSettingsPayload(userId: string) {
  const [storedSettings, calendars, readableCalendars, connection, autoInsertedSuggestionCount] = await Promise.all([
    getUserSuggestionSettings(userId),
    listWritableCalendars(userId),
    listReadableCalendars(userId),
    getGoogleConnection(userId),
    getAutoInsertedSuggestionCountForUser(userId)
  ]);

  let settings = storedSettings;
  const preferredCalendarExists = calendars.some((calendar) => calendar.id === settings.suggestionCalendarId);

  if (calendars.length > 0 && !preferredCalendarExists) {
    settings = await updateUserSuggestionSettings({
      userId,
      ...settings,
      suggestionCalendarId: calendars[0]?.id ?? "primary"
    });
  }

  const readableIds = new Set(readableCalendars.map((calendar) => calendar.id));
  const filteredMatchingIds = settings.matchingCalendarIds.filter((id) => readableIds.has(id));
  if (filteredMatchingIds.length !== settings.matchingCalendarIds.length) {
    settings = await updateUserSuggestionSettings({
      userId,
      ...settings,
      matchingCalendarIds: filteredMatchingIds
    });
  }

  if (settings.suggestionDeliveryMode !== "calendar_copy" || settings.shareEmailInSourceInvites) {
    settings = await updateUserSuggestionSettings({
      userId,
      ...settings,
      suggestionDeliveryMode: "calendar_copy",
      shareEmailInSourceInvites: false
    });
  }

  const criteria = await getSuggestionLearningSummary(userId);

  return serializeSettingsResponse({
    settings,
    criteria,
    autoInsertedSuggestionCount,
    calendars,
    readableCalendars,
    calendarConnected: Boolean(connection)
  });
}

async function updateSettingsPayload(userId: string, input: z.infer<typeof updateSettingsSchema>) {
  if (input.suggestionLimitPerWeek < input.suggestionLimitPerDay) {
    throw new Error("Das Wochenlimit muss mindestens so hoch sein wie das Tageslimit.");
  }

  const [calendars, readableCalendars] = await Promise.all([
    listWritableCalendars(userId),
    listReadableCalendars(userId)
  ]);

  const selectedCalendarId = input.suggestionCalendarId.trim();
  const isKnownCalendar = calendars.some((calendar) => calendar.id === selectedCalendarId);
  let finalCalendarId = selectedCalendarId;

  if (calendars.length === 0) {
    finalCalendarId = "primary";
  } else if (!isKnownCalendar) {
    throw new Error("Der ausgewählte Kalender ist nicht verfügbar oder nicht beschreibbar.");
  }

  const readableCalendarIds = new Set(readableCalendars.map((calendar) => calendar.id));
  const normalizedMatchingIds = Array.from(new Set(input.matchingCalendarIds.map((id) => id.trim()).filter(Boolean)));
  const normalizedBlockedCreatorIds = Array.from(new Set(input.blockedCreatorIds.map((id) => id.trim()).filter(Boolean)));
  const normalizedBlockedActivityTags = Array.from(
    new Set(
      input.blockedActivityTags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.startsWith("#"))
        .filter(Boolean)
    )
  );

  if (normalizedMatchingIds.some((id) => !readableCalendarIds.has(id))) {
    throw new Error("Mindestens ein ausgewählter Matching-Kalender ist nicht lesbar oder nicht mehr verfügbar.");
  }

  const settings = await updateUserSuggestionSettings({
    userId,
    autoInsertSuggestions: input.autoInsertSuggestions,
    suggestionCalendarId: finalCalendarId,
    suggestionDeliveryMode: "calendar_copy",
    shareEmailInSourceInvites: false,
    matchingCalendarIds: normalizedMatchingIds,
    blockedCreatorIds: normalizedBlockedCreatorIds,
    blockedActivityTags: normalizedBlockedActivityTags,
    suggestionLimitPerDay: input.suggestionLimitPerDay,
    suggestionLimitPerWeek: input.suggestionLimitPerWeek
  });

  ensureCalendarWatchesForUser(userId).catch((err) => {
    console.error("Calendar watch ensure failed after settings save", userId, err);
  });

  const [autoInsertedSuggestionCount, criteria] = await Promise.all([
    getAutoInsertedSuggestionCountForUser(userId),
    getSuggestionLearningSummary(userId)
  ]);

  return serializeSettingsResponse({
    settings,
    criteria,
    autoInsertedSuggestionCount,
    calendars,
    readableCalendars,
    calendarConnected: true
  });
}

function normalizeEmailForMatch(email: string) {
  return email.trim().toLowerCase();
}

function isEventInviteable(event: {
  createdBy: string;
  sourceProvider: string | null;
  sourceEventId: string | null;
}) {
  return event.sourceProvider === "google" && Boolean(event.sourceEventId?.trim());
}

function uniqueContactsForInvite(
  contacts: Awaited<ReturnType<typeof listGroupContactsForUser>>,
  ownerEmail: string
) {
  const ownerNorm = normalizeEmailForMatch(ownerEmail);
  const byEmail = new Map<string, { email: string; name: string | null; image: string | null }>();

  for (const contact of contacts) {
    const email = contact.emails[0] ?? contact.email;
    const normalized = normalizeEmailForMatch(email);
    if (normalized === ownerNorm || byEmail.has(normalized)) {
      continue;
    }

    byEmail.set(normalized, {
      email: normalized,
      name: contact.name ?? null,
      image: contact.image ?? null
    });
  }

  return Array.from(byEmail.values());
}

function parseGoogleSourceEventId(sourceEventId: string) {
  const normalized = sourceEventId.trim();
  if (!normalized) {
    return null;
  }

  const separatorIndex = normalized.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null;
  }

  return {
    calendarId: normalized.slice(0, separatorIndex),
    eventId: normalized.slice(separatorIndex + 1)
  };
}

function buildGoogleFallbackUrl(calendarId: string, eventId: string) {
  const encodedEventRef = Buffer.from(`${eventId} ${calendarId}`, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `https://www.google.com/calendar/event?${new URLSearchParams({ eid: encodedEventRef }).toString()}`;
}

function isGoogleCalendarUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === "calendar.google.com" || (url.hostname === "www.google.com" && url.pathname.startsWith("/calendar"));
  } catch {
    return false;
  }
}

async function getSourceEventUrl(userId: string, sourceProvider: string, sourceEventId: string) {
  if (sourceProvider !== "google") {
    throw new Error("Nur Google Events werden unterstützt.");
  }

  const parsedSource = parseGoogleSourceEventId(sourceEventId);
  if (!parsedSource) {
    throw new Error("Ungültige Event-Referenz.");
  }

  const fallbackUrl = buildGoogleFallbackUrl(parsedSource.calendarId, parsedSource.eventId);
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    return { url: fallbackUrl, source: "fallback" as const };
  }

  try {
    const detailsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(parsedSource.calendarId)}/events/${encodeURIComponent(parsedSource.eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        cache: "no-store"
      }
    );

    if (!detailsResponse.ok) {
      return { url: fallbackUrl, source: "fallback" as const };
    }

    const payload = (await detailsResponse.json()) as { htmlLink?: string };
    if (payload.htmlLink?.trim() && isGoogleCalendarUrl(payload.htmlLink)) {
      return { url: payload.htmlLink, source: "google" as const };
    }
  } catch {
    return { url: fallbackUrl, source: "fallback" as const };
  }

  return { url: fallbackUrl, source: "fallback" as const };
}

export function createRealiteMcpServer(user: McpUser) {
  const server = new McpServer(
    {
      name: "realite",
      version: "0.1.0"
    },
    {
      capabilities: {
        logging: {}
      }
    }
  );

  server.registerResource(
    "dashboard",
    "realite://dashboard",
    {
      title: "Dashboard",
      description: "Kompletter Dashboard-Snapshot des eingeloggten Realite-Nutzers.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "realite://dashboard",
          mimeType: "application/json",
          text: toText(await buildDashboardPayload(user))
        }
      ]
    })
  );

  server.registerResource("groups", "realite://groups", { title: "Gruppen", mimeType: "application/json" }, async () => ({
    contents: [
      {
        uri: "realite://groups",
        mimeType: "application/json",
        text: toText(await listGroupsForUser(user.id))
      }
    ]
  }));

  server.registerResource("events", "realite://events", { title: "Events", mimeType: "application/json" }, async () => ({
    contents: [
      {
        uri: "realite://events",
        mimeType: "application/json",
        text: toText((await listVisibleEventsForUser(user.id)).map((event) => serializeEvent(event)))
      }
    ]
  }));

  server.registerResource("suggestions", "realite://suggestions", { title: "Vorschlaege", mimeType: "application/json" }, async () => ({
    contents: [
      {
        uri: "realite://suggestions",
        mimeType: "application/json",
        text: toText((await listSuggestionsForUser(user.id)).map((suggestion) => serializeSuggestion(suggestion)))
      }
    ]
  }));

  server.registerResource("settings", "realite://settings", { title: "Settings", mimeType: "application/json" }, async () => ({
    contents: [
      {
        uri: "realite://settings",
        mimeType: "application/json",
        text: toText(await getSettingsPayload(user.id))
      }
    ]
  }));

  server.registerResource("dating", "realite://dating", { title: "Dating", mimeType: "application/json" }, async () => ({
    contents: [
      {
        uri: "realite://dating",
        mimeType: "application/json",
        text: toText(await getDateHashtagStatus(user.id))
      }
    ]
  }));

  server.registerTool(
    "dashboard.get",
    {
      description: "Liest den kompletten Dashboard-Status des aktuellen Realite-Kontos.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await buildDashboardPayload(user))
  );

  server.registerTool("dashboard.refresh", { description: "Startet einen Dashboard-Refresh im Hintergrund." }, async () =>
    successResult(buildDashboardRefreshPayload(user.id))
  );

  server.registerTool(
    "contacts.list",
    {
      description: "Listet alle Kontakte ueber alle Gruppen des Nutzers.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await listGroupContactsForUser(user.id))
  );

  server.registerTool(
    "groups.list",
    {
      description: "Listet alle sichtbaren Gruppen des Nutzers.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await listGroupsForUser(user.id))
  );

  server.registerTool("groups.create", { description: "Legt eine neue Gruppe an.", inputSchema: createGroupSchema }, async (input) => {
    try {
      return successResult(
        await createGroup({
          userId: user.id,
          name: input.name,
          description: input.description,
          hashtags: input.hashtags,
          visibility: input.visibility
        })
      );
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool("groups.update", { description: "Aktualisiert Hashtags oder Hidden-Status einer Gruppe.", inputSchema: updateGroupSchema }, async (input) => {
    try {
      if (input.hashtags !== undefined) {
        return successResult({
          updated: "hashtags",
          group: await updateGroupHashtags({
            groupId: input.groupId,
            userId: user.id,
            hashtags: input.hashtags
          })
        });
      }

      return successResult({
        updated: "isHidden",
        group: await setGroupHiddenState({
          groupId: input.groupId,
          userId: user.id,
          isHidden: input.isHidden ?? false
        })
      });
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool(
    "groups.delete",
    {
      description: "Loescht oder versteckt eine Gruppe je nach Systemregeln.",
      inputSchema: {
        groupId: z.string().uuid()
      }
    },
    async ({ groupId }) => {
      try {
        return successResult(await deleteOrHideGroup({ groupId, userId: user.id }));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "groups.add_member",
    {
      description: "Fuegt einer Gruppe ein Mitglied per E-Mail hinzu.",
      inputSchema: {
        groupId: z.string().uuid(),
        email: z.string().email()
      }
    },
    async ({ groupId, email }) => {
      try {
        return successResult(await addMemberToGroupByEmail({ groupId, requesterId: user.id, email }));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "groups.create_invite_link",
    {
      description: "Erzeugt einen Join-Link fuer eine Gruppe.",
      inputSchema: {
        groupId: z.string().uuid()
      }
    },
    async ({ groupId }) => {
      try {
        if (!(await isGroupMember(groupId, user.id))) {
          throw new Error("Keine Berechtigung fuer diese Gruppe.");
        }

        const invite = await createInviteLink({ groupId, createdBy: user.id });
        return successResult({
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
          inviteUrl: `${process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/join/${invite.token}`
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "groups.join_by_token",
    {
      description: "Tritt einer Gruppe ueber ein Invite-Token bei.",
      inputSchema: {
        token: z.string().min(1)
      }
    },
    async ({ token }) => {
      try {
        return successResult(await joinGroupByToken({ token, userId: user.id }));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "events.list",
    {
      description: "Listet alle fuer den Nutzer sichtbaren Events.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult((await listVisibleEventsForUser(user.id)).map((event) => serializeEvent(event)))
  );

  server.registerTool("events.create", { description: "Erstellt ein neues Event oder Smart-Treffen via Shortcut.", inputSchema: createEventSchema }, async (input) => {
    try {
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (endsAt <= startsAt) {
        throw new Error("Ende muss nach Start liegen.");
      }

      const shortcuts = parseSmartMeetingShortcuts(input.title);
      if (shortcuts.enabled) {
        if (!input.groupId) {
          throw new Error("Smart-Treffen-Shortcut benoetigt eine ausgewaehlte Gruppe.");
        }

        const durationMinutes = Math.max(15, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000));
        const searchWindowHours = shortcuts.searchWindowHours ?? 24;
        const smartMeeting = await createSmartMeetingPlanWithInitialRun({
          userId: user.id,
          groupId: input.groupId,
          title: shortcuts.cleanedTitle || input.title,
          description: input.description,
          location: input.location,
          tags: input.tags,
          durationMinutes,
          minAcceptedParticipants: shortcuts.minAcceptedParticipants ?? 2,
          responseWindowHours: shortcuts.responseWindowHours ?? 24,
          searchWindowStart: startsAt,
          searchWindowEnd: new Date(startsAt.getTime() + searchWindowHours * 60 * 60 * 1000),
          slotIntervalMinutes: shortcuts.slotIntervalMinutes ?? 30,
          maxAttempts: shortcuts.maxAttempts ?? 3
        });

        return successResult({
          mode: "smart_meeting_shortcut",
          smartMeeting: {
            ...smartMeeting,
            startsAt: smartMeeting.startsAt.toISOString(),
            endsAt: smartMeeting.endsAt.toISOString()
          }
        });
      }

      const event = await createEvent({
        userId: user.id,
        title: input.title,
        description: input.description,
        location: input.location,
        startsAt,
        endsAt,
        visibility: input.visibility,
        groupId: input.groupId,
        tags: input.tags,
        color: input.color ?? null,
        category: (input.category as EventCategory | undefined) ?? null
      });

      if (input.description?.trim()) {
        void fetchOgImageFromText(input.description).then((url) => {
          if (url) {
            return updateEventImageUrls(event.id, { linkPreviewImageUrl: url });
          }
        });
      }

      return successResult(event);
    } catch (error) {
      if (error instanceof RepositoryValidationError || error instanceof SmartMeetingValidationError) {
        return errorResult(error);
      }

      return errorResult(error);
    }
  });

  server.registerTool(
    "events.list_comments",
    {
      description: "Listet Kommentare eines sichtbaren Events.",
      inputSchema: {
        eventId: z.string().uuid()
      },
      annotations: { readOnlyHint: true }
    },
    async ({ eventId }) => {
      try {
        const event = await getVisibleEventForUserById({ userId: user.id, eventId });
        if (!event) {
          throw new Error("Event nicht gefunden.");
        }

        return successResult({ comments: await listEventComments(eventId) });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "events.add_comment",
    {
      description: "Fuegt einem Event einen Kommentar hinzu.",
      inputSchema: {
        eventId: z.string().uuid(),
        body: z.string().min(1).max(MAX_COMMENT_BODY_LENGTH)
      }
    },
    async ({ eventId, body }) => {
      try {
        const event = await getVisibleEventForUserById({ userId: user.id, eventId });
        if (!event) {
          throw new Error("Event nicht gefunden.");
        }

        return successResult({
          comment: await createEventComment({
            eventId,
            userId: user.id,
            body
          })
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "events.get_invite_context",
    {
      description: "Liest den aktuellen Invite-Status und Kontaktvorschlaege fuer ein Google-Event.",
      inputSchema: {
        eventId: z.string().uuid(),
        query: z.string().optional()
      },
      annotations: { readOnlyHint: true }
    },
    async ({ eventId, query }) => {
      try {
        const event = await getVisibleEventForUserById({ userId: user.id, eventId });
        if (!event || event.createdBy !== user.id || !isEventInviteable(event)) {
          throw new Error("Event nicht gefunden oder Einladungen nicht moeglich.");
        }

        const alreadyInvited =
          (await getSourceEventAttendees({
            ownerUserId: event.createdBy,
            sourceEventId: event.sourceEventId!
          })) ?? [];

        const calendarEventRef = (() => {
          const value = event.sourceEventId!.trim();
          const separator = value.lastIndexOf(":");
          if (separator <= 0 || separator >= value.length - 1) {
            return null;
          }

          return `${value.slice(0, separator)}::${value.slice(separator + 1)}`;
        })();

        const attendeeResponses =
          calendarEventRef && alreadyInvited.length > 0
            ? await getCalendarAttendeeResponses({
                userId: event.createdBy,
                calendarEventRef,
                attendeeEmails: alreadyInvited
              })
            : [];

        const uniqueContacts = uniqueContactsForInvite(await listGroupContactsForUser(user.id), user.email).filter(
          (contact) => !alreadyInvited.includes(contact.email)
        );

        const q = query?.trim();
        let candidates: Array<{ email: string; name: string | null; image: string | null }> = [];
        if (q) {
          const qLower = q.toLowerCase();
          candidates = uniqueContacts
            .filter((contact) => contact.email.includes(qLower) || (contact.name?.toLowerCase().includes(qLower) ?? false))
            .slice(0, SEARCH_CANDIDATES_LIMIT);

          const looksLikeEmail =
            q.includes("@") && q.length >= 3 && !candidates.some((candidate) => candidate.email === normalizeEmailForMatch(q));
          if (looksLikeEmail) {
            const normalized = normalizeEmailForMatch(q);
            if (normalized !== normalizeEmailForMatch(user.email) && !alreadyInvited.includes(normalized)) {
              candidates = [{ email: normalized, name: null, image: null }, ...candidates].slice(0, SEARCH_CANDIDATES_LIMIT);
            }
          }
        }

        return successResult({
          alreadyInvitedEmails: alreadyInvited,
          attendeeResponses,
          suggestedContacts: uniqueContacts.slice(0, INVITE_SUGGESTION_COUNT),
          ...(q ? { candidates } : {})
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "events.invite_contact",
    {
      description: "Laedt einen Kontakt zu einem Google-Quell-Event ein.",
      inputSchema: {
        eventId: z.string().uuid(),
        email: z.string().email()
      }
    },
    async ({ eventId, email }) => {
      try {
        const event = await getVisibleEventForUserById({ userId: user.id, eventId });
        if (!event || event.createdBy !== user.id || !isEventInviteable(event)) {
          throw new Error("Event nicht gefunden oder Einladungen nicht moeglich.");
        }

        const attendeeEmail = normalizeEmailForMatch(email);
        if (attendeeEmail === normalizeEmailForMatch(user.email)) {
          throw new Error("Du kannst dich nicht selbst einladen.");
        }

        const ok = await addAttendeeToSourceEvent({
          ownerUserId: event.createdBy,
          sourceEventId: event.sourceEventId!,
          attendeeEmail
        });

        if (!ok) {
          throw new Error("Einladung konnte nicht gesendet werden.");
        }

        return successResult({ ok: true });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "events.get_source_link",
    {
      description: "Ermittelt die Web-URL eines Quell-Events.",
      inputSchema: {
        sourceProvider: z.string().min(1),
        sourceEventId: z.string().min(1)
      },
      annotations: { readOnlyHint: true }
    },
    async ({ sourceProvider, sourceEventId }) => {
      try {
        return successResult(await getSourceEventUrl(user.id, sourceProvider, sourceEventId));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "suggestions.list",
    {
      description: "Listet alle Vorschlaege des Nutzers.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult((await listSuggestionsForUser(user.id)).map((suggestion) => serializeSuggestion(suggestion)))
  );

  server.registerTool("suggestions.decide", { description: "Akzeptiert oder lehnt einen Vorschlag ab.", inputSchema: suggestionDecisionSchema }, async (input) => {
    try {
      const suggestion = await applyDecisionFeedback({
        userId: user.id,
        suggestionId: input.suggestionId,
        decision: input.decision,
        reasons: input.reasons,
        note: input.note
      });

      const settings = await getUserSuggestionSettings(user.id);
      let calendarEventRef = suggestion.calendarEventId;

      if (input.decision === "accepted" && !calendarEventRef) {
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

      if (input.decision === "declined" && calendarEventRef) {
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
          decision: input.decision
        });
      }

      return successResult({ ok: true });
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool(
    "suggestions.get_calendar_link",
    {
      description: "Gibt die Web-URL des Kalendereintrags eines Vorschlags zurueck.",
      inputSchema: {
        suggestionId: z.string().uuid()
      },
      annotations: { readOnlyHint: true }
    },
    async ({ suggestionId }) => {
      try {
        const suggestion = await getSuggestionForUser(suggestionId, user.id);
        if (!suggestion?.calendarEventId?.trim()) {
          throw new Error("Kein Kalendertermin fuer diesen Vorschlag.");
        }

        return successResult({
          url: await getCalendarEventWebUrl({
            userId: user.id,
            calendarEventRef: suggestion.calendarEventId
          })
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "settings.get",
    {
      description: "Liest Matching-, Kalender- und Vorschlagseinstellungen.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await getSettingsPayload(user.id))
  );

  server.registerTool("settings.update", { description: "Aktualisiert Matching-, Kalender- und Vorschlagseinstellungen.", inputSchema: updateSettingsSchema }, async (input) => {
    try {
      return successResult(await updateSettingsPayload(user.id, input));
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool(
    "dating.get",
    {
      description: "Liest den Dating-Status und die Date-Hashtag-Freischaltung.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await getDateHashtagStatus(user.id))
  );

  server.registerTool("dating.update", { description: "Aktualisiert das Dating-Profil des Nutzers.", inputSchema: updateDatingSchema }, async (input) => {
    try {
      const current = await getDateHashtagStatus(user.id);
      const nextProfile = {
        ...current.profile,
        ...input
      };

      if (
        nextProfile.soughtAgeMin !== null &&
        nextProfile.soughtAgeMax !== null &&
        nextProfile.soughtAgeMin > nextProfile.soughtAgeMax
      ) {
        throw new Error("Der minimale Such-Alter muss kleiner oder gleich dem maximalen Alter sein.");
      }

      if (nextProfile.enabled && nextProfile.birthYear !== null && currentYear - nextProfile.birthYear < DATE_MIN_AGE) {
        throw new Error(`Der Dating-Modus ist erst ab ${DATE_MIN_AGE} Jahren verfuegbar.`);
      }

      await updateUserDatingProfile({
        userId: user.id,
        enabled: nextProfile.enabled,
        birthYear: nextProfile.birthYear,
        gender: nextProfile.gender,
        isSingle: nextProfile.isSingle,
        soughtGenders: nextProfile.soughtGenders,
        soughtAgeMin: nextProfile.soughtAgeMin,
        soughtAgeMax: nextProfile.soughtAgeMax,
        soughtOnlySingles: nextProfile.soughtOnlySingles
      });

      return successResult(await getDateHashtagStatus(user.id));
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool(
    "smart_meetings.list",
    {
      description: "Listet alle Smart-Treffen des Nutzers.",
      annotations: { readOnlyHint: true }
    },
    async () => successResult(await listSmartMeetingsForUser(user.id))
  );

  server.registerTool("smart_meetings.create", { description: "Legt ein Smart-Treffen an.", inputSchema: createSmartMeetingSchema }, async (input) => {
    try {
      const created = await createSmartMeetingPlanWithInitialRun({
        userId: user.id,
        title: input.title,
        description: input.description,
        location: input.location,
        groupId: input.groupId,
        tags: input.tags,
        durationMinutes: input.durationMinutes,
        minAcceptedParticipants: input.minAcceptedParticipants,
        responseWindowHours: input.responseWindowHours,
        searchWindowStart: new Date(input.searchWindowStart),
        searchWindowEnd: new Date(input.searchWindowEnd),
        slotIntervalMinutes: input.slotIntervalMinutes,
        maxAttempts: input.maxAttempts
      });

      return successResult({
        smartMeeting: {
          ...created,
          startsAt: created.startsAt.toISOString(),
          endsAt: created.endsAt.toISOString()
        }
      });
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool("smart_meetings.update", { description: "Aktualisiert ein bestehendes Smart-Treffen.", inputSchema: updateSmartMeetingSchema }, async (input) => {
    try {
      await updateSmartMeetingPlan(input.planId, user.id, {
        title: input.title,
        description: input.description,
        location: input.location,
        groupId: input.groupId,
        tags: input.tags,
        durationMinutes: input.durationMinutes,
        minAcceptedParticipants: input.minAcceptedParticipants,
        responseWindowHours: input.responseWindowHours,
        searchWindowStart: input.searchWindowStart ? new Date(input.searchWindowStart) : undefined,
        searchWindowEnd: input.searchWindowEnd ? new Date(input.searchWindowEnd) : undefined,
        slotIntervalMinutes: input.slotIntervalMinutes,
        maxAttempts: input.maxAttempts
      });

      return successResult({ ok: true });
    } catch (error) {
      return errorResult(error);
    }
  });

  return server;
}
