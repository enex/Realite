import { fetchOgImageFromText } from "@/src/lib/link-preview";
import {
  deleteCalendarWatchChannelById,
  deleteCalendarWatchChannelsByUserId,
  insertCalendarWatchChannel,
  listCalendarWatchChannelsByUserId,
  deleteEventsByIds,
  ensureAlleGroupForUser,
  getGoogleConnection,
  getUserSuggestionSettings,
  getUserById,
  listExternalSourceEventsForUser,
  listSuggestionCalendarRefsByEventIds,
  updateEventImageUrls,
  updateGoogleConnectionTokens,
  upsertExternalPublicEvent
} from "@/src/lib/repository";
import {
  buildRealiteCalendarMetadata,
  stripRealiteCalendarMetadata,
  type RealiteCalendarLinkType
} from "@/src/lib/realite-calendar-links";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

type BusyWindow = {
  start: string;
  end: string;
};

export type CalendarAttendeeResponse = {
  email: string;
  responseStatus: "accepted" | "declined" | "tentative" | "needsAction" | "unknown";
};

export type WritableGoogleCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

export type ReadableGoogleCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

const FREE_BUSY_CHUNK_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_FREE_BUSY_SPLIT_DEPTH = 8;
const SOURCE_INVITE_REF_PREFIX = "source-invite::";
const REALITE_TITLE_PREFIX_REGEX = /^\s*\[(?:realite(?:\s*vorschlag)?)\]\s*/iu;
const HASHTAG_REGEX = /(^|\s)#[\p{L}\p{N}_-]+/gu;

type CalendarApiEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  attendees?: Array<{
    email?: string;
    responseStatus?: string;
  }>;
  extendedProperties?: {
    private?: Record<string, string | undefined>;
  };
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
};

type SourceInviteRef = {
  ownerUserId: string;
  calendarId: string;
  eventId: string;
  attendeeEmail: string;
};

function getRealiteBaseUrl() {
  const baseUrl =
    process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || process.env.REALITE_APP_URL || "https://realite.app";
  return baseUrl.replace(/\/+$/, "");
}

function buildRealiteEventUrl(eventId: string) {
  return `${getRealiteBaseUrl()}/e/${shortenUUID(eventId)}`;
}

function buildRealiteSuggestionUrl(suggestionId: string) {
  return `${getRealiteBaseUrl()}/s/${shortenUUID(suggestionId)}`;
}

function normalizeRealiteCalendarTitle(rawTitle: string) {
  const titleWithoutPrefix = rawTitle.replace(REALITE_TITLE_PREFIX_REGEX, "").trim();
  const titleWithoutTags = titleWithoutPrefix.replace(HASHTAG_REGEX, "$1");
  const compact = titleWithoutTags.replace(/\s{2,}/g, " ").trim();
  return compact || "Event";
}

function sanitizeRealiteCalendarDescription(rawDescription?: string | null) {
  const normalized = (rawDescription ?? "").replace(/\r\n/g, "\n");
  const sanitized = normalized
    .split("\n")
    .map((line) => line.replace(HASHTAG_REGEX, "$1").replace(/\s{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitized || null;
}

function buildRealiteCalendarSummary(input: { title: string; type: RealiteCalendarLinkType }) {
  const prefix = input.type === "suggestion" ? "[Realite Vorschlag]" : "[Realite]";
  return `${prefix} ${normalizeRealiteCalendarTitle(input.title)}`.trim();
}

async function ensureGoogleEventHasRealiteLink(input: {
  token: string;
  calendarId: string;
  googleEventId: string;
  currentDescription?: string | null;
  url: string;
  linkType: RealiteCalendarLinkType;
}) {
  const nextDescription = buildRealiteCalendarMetadata({
    description: input.currentDescription,
    url: input.url,
    type: input.linkType
  });
  const currentDescription = (input.currentDescription ?? "").replace(/\r\n/g, "\n").trim();
  if (currentDescription === nextDescription.trim()) {
    return;
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}` +
      `/events/${encodeURIComponent(input.googleEventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: nextDescription
      })
    }
  );

  if (response.ok || response.status === 403 || response.status === 404) {
    return;
  }

  const details = await readGoogleError(response);
  throw new Error(
    `Google Event-Link konnte nicht aktualisiert werden (${response.status})${
      details ? `: ${details}` : ""
    }`
  );
}

async function readGoogleError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    return payload.error?.message ?? null;
  } catch {
    return null;
  }
}

function extractTags(text: string) {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return Array.from(new Set(matches.map((tag) => tag.toLowerCase().normalize("NFC"))));
}

function containsAlleTagInTitle(title?: string) {
  if (!title) {
    return false;
  }

  return /(^|\s)#alle(\b|$)/iu.test(title);
}

function isRealiteManagedCalendarEvent(event: CalendarApiEvent) {
  const normalizedSummary = event.summary?.trim() ?? "";
  if (/^\[realite\]\s*/iu.test(normalizedSummary)) {
    return true;
  }

  const suggestionId = event.extendedProperties?.private?.realiteSuggestionId;
  return Boolean(suggestionId?.trim());
}

function parseGoogleEventDate(value?: { dateTime?: string; date?: string }) {
  if (value?.dateTime) {
    return new Date(value.dateTime);
  }

  if (value?.date) {
    return new Date(`${value.date}T00:00:00.000Z`);
  }

  return null;
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

function encodeSourceInviteRef(input: SourceInviteRef) {
  const encoded = Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  return `${SOURCE_INVITE_REF_PREFIX}${encoded}`;
}

function decodeSourceInviteRef(value: string): SourceInviteRef | null {
  if (!value.startsWith(SOURCE_INVITE_REF_PREFIX)) {
    return null;
  }

  const encoded = value.slice(SOURCE_INVITE_REF_PREFIX.length);
  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SourceInviteRef>;
    if (!parsed.ownerUserId || !parsed.calendarId || !parsed.eventId || !parsed.attendeeEmail) {
      return null;
    }

    return {
      ownerUserId: parsed.ownerUserId,
      calendarId: parsed.calendarId,
      eventId: parsed.eventId,
      attendeeEmail: parsed.attendeeEmail
    };
  } catch {
    return null;
  }
}

function parseCalendarEventRef(eventRef: string) {
  if (!eventRef.includes("::")) {
    return {
      calendarId: null as string | null,
      eventId: eventRef
    };
  }

  return {
    calendarId: eventRef.split("::")[0] || null,
    eventId: eventRef.split("::").slice(1).join("::")
  };
}

function normalizeAttendeeEmails(emails: string[]) {
  return Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function filterConfiguredCalendarIds(allCalendarIds: string[], configuredIds: string[]) {
  const normalizedConfigured = Array.from(new Set(configuredIds.map((id) => id.trim()).filter(Boolean)));
  if (!normalizedConfigured.length) {
    return allCalendarIds;
  }

  const filtered = allCalendarIds.filter((id) => normalizedConfigured.includes(id));
  return filtered.length ? filtered : allCalendarIds;
}

async function refreshAccessToken(userId: string, refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth Credentials fehlen");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh fehlgeschlagen (${response.status})`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  await updateGoogleConnectionTokens({
    userId,
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
    refreshToken: payload.refresh_token
  });

  return payload.access_token;
}

export async function getGoogleAccessToken(userId: string) {
  const connection = await getGoogleConnection(userId);
  if (!connection) {
    return null;
  }

  const expirationBuffer = Date.now() + 60_000;

  if (!connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() > expirationBuffer) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    return null;
  }

  return refreshAccessToken(userId, connection.refreshToken);
}

export async function getBusyWindows(input: { userId: string; timeMin: Date; timeMax: Date }) {
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return null as BusyWindow[] | null;
  }

  if (input.timeMax <= input.timeMin) {
    return [] as BusyWindow[];
  }

  const [allCalendarIds, settings] = await Promise.all([
    listReadableCalendarIds(token),
    getUserSuggestionSettings(input.userId)
  ]);
  const calendarIds = filterConfiguredCalendarIds(allCalendarIds, settings.matchingCalendarIds);
  if (!calendarIds.length) {
    return [] as BusyWindow[];
  }

  const allWindows: BusyWindow[] = [];
  let cursor = new Date(input.timeMin);

  while (cursor < input.timeMax) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + FREE_BUSY_CHUNK_MS, input.timeMax.getTime()));
    const busy = await fetchBusyWindowsWithSplit(token, calendarIds, cursor, chunkEnd, 0);

    // Ohne FreeBusy-Berechtigung geben wir "unknown" zurück.
    if (busy === null) {
      return null as BusyWindow[] | null;
    }

    allWindows.push(...busy);
    cursor = chunkEnd;
  }

  return mergeBusyWindows(allWindows);
}

async function fetchBusyWindowsWithSplit(
  token: string,
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date,
  depth: number
): Promise<BusyWindow[] | null> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map((id) => ({ id }))
    })
  });

  if (!response.ok) {
    const details = await readGoogleError(response);

    if (response.status === 403) {
      return null;
    }

    if (
      response.status === 400 &&
      details?.toLowerCase().includes("time range is too long") &&
      depth < MAX_FREE_BUSY_SPLIT_DEPTH
    ) {
      const middle = new Date(Math.floor((timeMin.getTime() + timeMax.getTime()) / 2));

      // Schutz vor Endlosschleifen bei sehr kleinen Intervallen.
      if (middle <= timeMin || middle >= timeMax) {
        throw new Error(
          `FreeBusy Request fehlgeschlagen (${response.status})${details ? `: ${details}` : ""}`
        );
      }

      const left = await fetchBusyWindowsWithSplit(token, calendarIds, timeMin, middle, depth + 1);
      if (left === null) {
        return null;
      }

      const right = await fetchBusyWindowsWithSplit(token, calendarIds, middle, timeMax, depth + 1);
      if (right === null) {
        return null;
      }

      return [...left, ...right];
    }

    throw new Error(
      `FreeBusy Request fehlgeschlagen (${response.status})${details ? `: ${details}` : ""}`
    );
  }

  const data = (await response.json()) as {
    calendars?: Record<string, { busy?: BusyWindow[] }>;
  };

  const windows: BusyWindow[] = [];
  for (const calendar of Object.values(data.calendars ?? {})) {
    windows.push(...(calendar.busy ?? []));
  }

  return windows;
}

function mergeBusyWindows(windows: BusyWindow[]) {
  if (!windows.length) {
    return [] as BusyWindow[];
  }

  const sorted = windows
    .map((window) => ({
      start: new Date(window.start),
      end: new Date(window.end)
    }))
    .filter((window) => window.end > window.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!sorted.length) {
    return [] as BusyWindow[];
  }

  const merged = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end > last.end) {
        last.end = current.end;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged.map((window) => ({
    start: window.start.toISOString(),
    end: window.end.toISOString()
  }));
}

export async function insertSuggestionIntoCalendar(input: {
  userId: string;
  suggestionId: string;
  eventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  calendarId?: string;
  blockedCalendarIds?: string[];
  linkType?: RealiteCalendarLinkType;
}) {
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return null;
  }

  const preferredCalendarId = input.calendarId?.trim() || "primary";
  const blockedCalendarIds = new Set(
    (input.blockedCalendarIds ?? []).map((id) => id.trim()).filter(Boolean)
  );
  const candidateCalendars = Array.from(
    new Set([preferredCalendarId, "primary"].filter((id) => id && !blockedCalendarIds.has(id)))
  );

  if (!candidateCalendars.length) {
    return null;
  }

  const eventUrl = buildRealiteEventUrl(input.eventId);
  const suggestionUrl = buildRealiteSuggestionUrl(input.suggestionId);
  const linkType = input.linkType ?? "suggestion";
  const shortcutUrl = linkType === "event" ? eventUrl : suggestionUrl;
  const eventPayload = {
    summary: buildRealiteCalendarSummary({
      title: input.title,
      type: linkType
    }),
    description: buildRealiteCalendarMetadata({
      description: sanitizeRealiteCalendarDescription(input.description),
      url: shortcutUrl,
      type: linkType
    }),
    location: input.location ?? undefined,
    start: {
      dateTime: input.startsAt.toISOString()
    },
    end: {
      dateTime: input.endsAt.toISOString()
    },
    transparency: "transparent",
    iCalUID: `realite-${input.userId}-${input.eventId}@realite.app`,
    extendedProperties: {
      private: {
        realiteSuggestionId: input.suggestionId,
        realiteEventId: input.eventId
      }
    }
  };

  async function createInCalendar(targetCalendarId: string) {
    return fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?sendUpdates=none`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventPayload)
      }
    );
  }

  async function findExistingInCalendar(targetCalendarId: string) {
    async function queryIds(property: string, value: string) {
      const params = new URLSearchParams({
        privateExtendedProperty: `${property}=${value}`,
        maxResults: "10",
        showDeleted: "false"
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        return [] as string[];
      }

      const payload = (await response.json()) as {
        items?: Array<{ id?: string }>;
      };

      return (payload.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
    }

    const ids = Array.from(
      new Set([
        ...(await queryIds("realiteEventId", input.eventId)),
        ...(await queryIds("realiteSuggestionId", input.suggestionId))
      ])
    );

    if (!ids.length) {
      return null;
    }

    const keepId = ids[0];

    // Bestehende Alt-Dubletten derselben Suggestion bereinigen.
    for (const duplicateId of ids.slice(1)) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(duplicateId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    }

    return `${targetCalendarId}::${keepId}`;
  }

  for (const calendarId of candidateCalendars) {
    const existingInCalendar = await findExistingInCalendar(calendarId);
    if (existingInCalendar) {
      return existingInCalendar;
    }
  }

  let lastFailure: { status: number; details: string | null } | null = null;

  for (const calendarId of candidateCalendars) {
    const response = await createInCalendar(calendarId);
    if (!response.ok) {
      const details = await readGoogleError(response);
      lastFailure = { status: response.status, details };

      if (response.status === 403 || response.status === 404) {
        continue;
      }

      throw new Error(`Kalendereintrag fehlgeschlagen (${response.status})${details ? `: ${details}` : ""}`);
    }

    const payload = (await response.json()) as { id?: string };
    return payload.id ? `${calendarId}::${payload.id}` : null;
  }

  if (lastFailure) {
    throw new Error(
      `Kalendereintrag fehlgeschlagen (${lastFailure.status})${
        lastFailure.details ? `: ${lastFailure.details}` : ""
      }`
    );
  }

  return null;
}

export async function insertGroupMeetingIntoCalendar(input: {
  userId: string;
  eventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  attendeeEmails: string[];
  calendarId?: string;
}) {
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return null;
  }

  const preferredCalendarId = input.calendarId?.trim() || "primary";
  const candidateCalendars = Array.from(new Set([preferredCalendarId, "primary"]));
  const attendees = normalizeAttendeeEmails(input.attendeeEmails).map((email) => ({
    email,
    responseStatus: "needsAction" as const
  }));
  const eventUrl = buildRealiteEventUrl(input.eventId);
  const payload = {
    summary: buildRealiteCalendarSummary({
      title: input.title,
      type: "event" as const
    }),
    description: buildRealiteCalendarMetadata({
      description: sanitizeRealiteCalendarDescription(input.description),
      url: eventUrl,
      type: "event"
    }),
    location: input.location ?? undefined,
    start: {
      dateTime: input.startsAt.toISOString()
    },
    end: {
      dateTime: input.endsAt.toISOString()
    },
    attendees,
    transparency: "opaque",
    iCalUID: `realite-group-${input.userId}-${input.eventId}@realite.app`,
    extendedProperties: {
      private: {
        realiteEventId: input.eventId,
        realiteManagedType: "smart_meeting"
      }
    }
  };

  let lastFailure: { status: number; details: string | null } | null = null;

  for (const calendarId of candidateCalendars) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const details = await readGoogleError(response);
      lastFailure = { status: response.status, details };
      if (response.status === 403 || response.status === 404) {
        continue;
      }

      throw new Error(
        `Smart-Treffen konnte nicht im Kalender erstellt werden (${response.status})${details ? `: ${details}` : ""}`
      );
    }

    const responsePayload = (await response.json()) as { id?: string };
    return responsePayload.id ? `${calendarId}::${responsePayload.id}` : null;
  }

  if (lastFailure) {
    throw new Error(
      `Smart-Treffen konnte nicht im Kalender erstellt werden (${lastFailure.status})${
        lastFailure.details ? `: ${lastFailure.details}` : ""
      }`
    );
  }

  return null;
}

/** Returns attendee emails of the Google Calendar source event, or null if not accessible. */
export async function getSourceEventAttendees(input: {
  ownerUserId: string;
  sourceEventId: string;
}): Promise<string[] | null> {
  const sourceRef = parseGoogleSourceEventId(input.sourceEventId);
  if (!sourceRef) {
    return null;
  }

  const token = await getGoogleAccessToken(input.ownerUserId);
  if (!token) {
    return null;
  }

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceRef.calendarId)}` +
    `/events/${encodeURIComponent(sourceRef.eventId)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      return null;
    }
    return null;
  }

  const event = (await response.json()) as CalendarApiEvent;
  const attendees = event.attendees ?? [];
  return attendees
    .map((a) => a.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
}

/** Adds an attendee by email to the Google Calendar source event. Sends invite via Google. */
export async function addAttendeeToSourceEvent(input: {
  ownerUserId: string;
  sourceEventId: string;
  attendeeEmail: string;
}): Promise<boolean> {
  const email = input.attendeeEmail.trim().toLowerCase();
  if (!email) {
    return false;
  }

  const sourceRef = parseGoogleSourceEventId(input.sourceEventId);
  if (!sourceRef) {
    return false;
  }

  const token = await getGoogleAccessToken(input.ownerUserId);
  if (!token) {
    return false;
  }

  const sourceEventUrl =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceRef.calendarId)}` +
    `/events/${encodeURIComponent(sourceRef.eventId)}`;

  const sourceEventResponse = await fetch(sourceEventUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!sourceEventResponse.ok) {
    if (sourceEventResponse.status === 403 || sourceEventResponse.status === 404) {
      return false;
    }
    const details = await readGoogleError(sourceEventResponse);
    throw new Error(
      `Source-Event konnte nicht geladen werden (${sourceEventResponse.status})${details ? `: ${details}` : ""}`
    );
  }

  const sourceEvent = (await sourceEventResponse.json()) as CalendarApiEvent;
  const attendees = sourceEvent.attendees ?? [];
  const alreadyInvited = attendees.some((a) => a.email?.trim().toLowerCase() === email);
  if (alreadyInvited) {
    return true;
  }

  const patchResponse = await fetch(`${sourceEventUrl}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendees: [...attendees, { email, responseStatus: "needsAction" as const }]
    })
  });

  if (!patchResponse.ok) {
    if (patchResponse.status === 403 || patchResponse.status === 404) {
      return false;
    }
    const details = await readGoogleError(patchResponse);
    throw new Error(
      `Einladung konnte nicht gesendet werden (${patchResponse.status})${details ? `: ${details}` : ""}`
    );
  }

  return true;
}

export async function insertSuggestionAsSourceInvite(input: {
  suggestionId: string;
  targetUserId: string;
  sourceOwnerUserId: string;
  sourceEventId: string;
}) {
  if (input.targetUserId === input.sourceOwnerUserId) {
    return null;
  }

  const sourceRef = parseGoogleSourceEventId(input.sourceEventId);
  if (!sourceRef) {
    return null;
  }

  const [sourceOwnerToken, targetUser] = await Promise.all([
    getGoogleAccessToken(input.sourceOwnerUserId),
    getUserById(input.targetUserId)
  ]);

  const attendeeEmail = targetUser?.email?.trim().toLowerCase() ?? "";
  if (!sourceOwnerToken || !attendeeEmail) {
    return null;
  }

  const sourceEventUrl =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceRef.calendarId)}` +
    `/events/${encodeURIComponent(sourceRef.eventId)}`;

  const sourceEventResponse = await fetch(sourceEventUrl, {
    headers: {
      Authorization: `Bearer ${sourceOwnerToken}`
    }
  });

  if (!sourceEventResponse.ok) {
    if (sourceEventResponse.status === 403 || sourceEventResponse.status === 404) {
      return null;
    }

    const details = await readGoogleError(sourceEventResponse);
    throw new Error(
      `Source-Event konnte nicht geladen werden (${sourceEventResponse.status})${
        details ? `: ${details}` : ""
      }`
    );
  }

  const sourceEvent = (await sourceEventResponse.json()) as CalendarApiEvent;
  const attendees = sourceEvent.attendees ?? [];
  const alreadyInvited = attendees.some(
    (attendee) => attendee.email?.trim().toLowerCase() === attendeeEmail
  );

  if (alreadyInvited) {
    return encodeSourceInviteRef({
      ownerUserId: input.sourceOwnerUserId,
      calendarId: sourceRef.calendarId,
      eventId: sourceRef.eventId,
      attendeeEmail
    });
  }

  const patchResponse = await fetch(`${sourceEventUrl}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${sourceOwnerToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendees: [...attendees, { email: attendeeEmail, responseStatus: "needsAction" }],
      extendedProperties: {
        private: {
          ...(sourceEvent.extendedProperties?.private ?? {}),
          realiteSuggestionSourceInvite: input.suggestionId
        }
      }
    })
  });

  if (!patchResponse.ok) {
    if (patchResponse.status === 403 || patchResponse.status === 404) {
      return null;
    }

    const details = await readGoogleError(patchResponse);
    throw new Error(
      `Source-Einladung konnte nicht erstellt werden (${patchResponse.status})${details ? `: ${details}` : ""}`
    );
  }

  return encodeSourceInviteRef({
    ownerUserId: input.sourceOwnerUserId,
    calendarId: sourceRef.calendarId,
    eventId: sourceRef.eventId,
    attendeeEmail
  });
}

async function updateSourceInviteResponseStatus(
  input: SourceInviteRef & { responseStatus: "needsAction" | "accepted" | "declined" }
) {
  const token = await getGoogleAccessToken(input.ownerUserId);
  if (!token) {
    return false;
  }

  const sourceEventUrl =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}` +
    `/events/${encodeURIComponent(input.eventId)}`;

  const sourceEventResponse = await fetch(sourceEventUrl, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!sourceEventResponse.ok) {
    return sourceEventResponse.status === 403 || sourceEventResponse.status === 404 || sourceEventResponse.status === 410;
  }

  const sourceEvent = (await sourceEventResponse.json()) as CalendarApiEvent;
  const attendees = sourceEvent.attendees ?? [];
  const email = input.attendeeEmail.trim().toLowerCase();
  let touched = false;
  const updatedAttendees = attendees.map((attendee) => {
    if (attendee.email?.trim().toLowerCase() !== email) {
      return attendee;
    }

    touched = true;
    return {
      ...attendee,
      responseStatus: input.responseStatus
    };
  });

  if (!touched) {
    return true;
  }

  const patchResponse = await fetch(`${sourceEventUrl}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendees: updatedAttendees
    })
  });

  if (patchResponse.ok) {
    return true;
  }

  return patchResponse.status === 403 || patchResponse.status === 404 || patchResponse.status === 410;
}

export async function syncSuggestionDecisionInCalendar(input: {
  userId: string;
  calendarEventRef: string;
  decision: "accepted" | "declined";
}) {
  const eventRef = input.calendarEventRef.trim();
  if (!eventRef) {
    return false;
  }

  const sourceInviteRef = decodeSourceInviteRef(eventRef);
  if (sourceInviteRef) {
    return updateSourceInviteResponseStatus({
      ...sourceInviteRef,
      responseStatus: input.decision
    });
  }

  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return false;
  }

  const parsed = parseCalendarEventRef(eventRef);
  if (!parsed.eventId) {
    return false;
  }

  const candidateCalendars = Array.from(
    new Set(
      [parsed.calendarId, "primary"]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value))
    )
  );

  const transparency = input.decision === "accepted" ? "opaque" : "transparent";

  for (const calendarId of candidateCalendars) {
    let nextDescription: string | undefined;
    let nextSummary: string | undefined;
    if (input.decision === "accepted") {
      const eventResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}` +
          `/events/${encodeURIComponent(parsed.eventId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (eventResponse.ok) {
        const payload = (await eventResponse.json()) as CalendarApiEvent;
        nextSummary = buildRealiteCalendarSummary({
          title: payload.summary ?? "Event",
          type: "event"
        });
        const realiteEventId = payload.extendedProperties?.private?.realiteEventId?.trim();
        if (realiteEventId) {
          nextDescription = buildRealiteCalendarMetadata({
            description: sanitizeRealiteCalendarDescription(payload.description ?? null),
            url: buildRealiteEventUrl(realiteEventId),
            type: "event"
          });
        }
      }
    }

    const patchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.eventId)}?sendUpdates=none`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transparency,
          ...(nextSummary ? { summary: nextSummary } : {}),
          ...(nextDescription ? { description: nextDescription } : {})
        })
      }
    );

    if (patchResponse.ok) {
      return true;
    }

    if (patchResponse.status === 403 || patchResponse.status === 404) {
      continue;
    }
  }

  return false;
}

export async function ensureSuggestionNonBusyInCalendar(input: {
  userId: string;
  calendarEventRef: string;
  eventId?: string;
}) {
  const eventRef = input.calendarEventRef.trim();
  if (!eventRef) {
    return false;
  }

  const sourceInviteRef = decodeSourceInviteRef(eventRef);
  if (sourceInviteRef) {
    return updateSourceInviteResponseStatus({
      ...sourceInviteRef,
      responseStatus: "needsAction"
    });
  }

  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return false;
  }

  const parsed = parseCalendarEventRef(eventRef);
  if (!parsed.eventId) {
    return false;
  }

  const candidateCalendars = Array.from(
    new Set(
      [parsed.calendarId, "primary"]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (input.eventId) {
    for (const calendarId of candidateCalendars) {
      const params = new URLSearchParams({
        privateExtendedProperty: `realiteEventId=${input.eventId}`,
        maxResults: "20",
        showDeleted: "false"
      });

      const listResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!listResponse.ok) {
        continue;
      }

      const payload = (await listResponse.json()) as {
        items?: Array<{ id?: string }>;
      };
      const ids = (payload.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
      if (ids.length <= 1) {
        continue;
      }

      const keepId = ids.includes(parsed.eventId) ? parsed.eventId : ids[0];
      for (const duplicateId of ids) {
        if (duplicateId === keepId) {
          continue;
        }

        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(duplicateId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
    }
  }

  for (const calendarId of candidateCalendars) {
    const patchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.eventId)}?sendUpdates=none`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ transparency: "transparent" })
      }
    );

    if (patchResponse.ok) {
      return true;
    }

    if (patchResponse.status === 403 || patchResponse.status === 404) {
      continue;
    }
  }

  return false;
}

export async function getCalendarAttendeeResponses(input: {
  userId: string;
  calendarEventRef: string;
  attendeeEmails: string[];
}): Promise<CalendarAttendeeResponse[]> {
  const eventRef = input.calendarEventRef.trim();
  if (!eventRef) {
    return [] as CalendarAttendeeResponse[];
  }

  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return [] as CalendarAttendeeResponse[];
  }

  const parsed = parseCalendarEventRef(eventRef);
  if (!parsed.eventId) {
    return [] as CalendarAttendeeResponse[];
  }

  const normalizedEmails = normalizeAttendeeEmails(input.attendeeEmails);
  if (!normalizedEmails.length) {
    return [] as CalendarAttendeeResponse[];
  }

  const candidateCalendars = Array.from(
    new Set(
      [parsed.calendarId, "primary"]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value))
    )
  );

  for (const calendarId of candidateCalendars) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 403 || response.status === 404 || response.status === 410) {
        continue;
      }

      const details = await readGoogleError(response);
      throw new Error(
        `Attendee-Status konnte nicht geladen werden (${response.status})${details ? `: ${details}` : ""}`
      );
    }

    const payload = (await response.json()) as CalendarApiEvent;
    const attendeeStatusByEmail = new Map<string, CalendarAttendeeResponse["responseStatus"]>();

    for (const attendee of payload.attendees ?? []) {
      const email = attendee.email?.trim().toLowerCase();
      if (!email) {
        continue;
      }

      const rawStatus = attendee.responseStatus?.trim() ?? "";
      const responseStatus: CalendarAttendeeResponse["responseStatus"] =
        rawStatus === "accepted" ||
        rawStatus === "declined" ||
        rawStatus === "tentative" ||
        rawStatus === "needsAction"
          ? (rawStatus as CalendarAttendeeResponse["responseStatus"])
          : "unknown";
      attendeeStatusByEmail.set(email, responseStatus);
    }

    return normalizedEmails.map((email) => ({
      email,
      responseStatus: attendeeStatusByEmail.get(email) ?? "needsAction"
    }));
  }

  return normalizedEmails.map((email) => ({
    email,
    responseStatus: "unknown"
  }));
}

async function removeSourceInviteAttendee(input: SourceInviteRef) {
  const token = await getGoogleAccessToken(input.ownerUserId);
  if (!token) {
    return false;
  }

  const sourceEventUrl =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}` +
    `/events/${encodeURIComponent(input.eventId)}`;

  const sourceEventResponse = await fetch(sourceEventUrl, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!sourceEventResponse.ok) {
    if (sourceEventResponse.status === 403 || sourceEventResponse.status === 404 || sourceEventResponse.status === 410) {
      return true;
    }

    return false;
  }

  const sourceEvent = (await sourceEventResponse.json()) as CalendarApiEvent;
  const attendees = sourceEvent.attendees ?? [];
  const filteredAttendees = attendees.filter(
    (attendee) => attendee.email?.trim().toLowerCase() !== input.attendeeEmail.trim().toLowerCase()
  );

  if (filteredAttendees.length === attendees.length) {
    return true;
  }

  const patchResponse = await fetch(`${sourceEventUrl}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendees: filteredAttendees
    })
  });

  if (patchResponse.ok) {
    return true;
  }

  return patchResponse.status === 403 || patchResponse.status === 404 || patchResponse.status === 410;
}

export async function removeSuggestionCalendarEvent(input: {
  userId: string;
  calendarEventRef: string;
  preferredCalendarId?: string | null;
}) {
  const eventRef = input.calendarEventRef.trim();
  if (!eventRef) {
    return false;
  }

  const sourceInviteRef = decodeSourceInviteRef(eventRef);
  if (sourceInviteRef) {
    return removeSourceInviteAttendee(sourceInviteRef);
  }

  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return false;
  }

  const parsed = parseCalendarEventRef(eventRef);

  if (!parsed.eventId) {
    return false;
  }

  const candidateCalendars = Array.from(
    new Set(
      [parsed.calendarId, input.preferredCalendarId ?? null, "primary"]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value))
    )
  );

  let sawNotFound = false;
  let sawForbidden = false;

  for (const calendarId of candidateCalendars) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.ok || response.status === 410) {
      return true;
    }

    if (response.status === 404) {
      sawNotFound = true;
      continue;
    }

    if (response.status === 403) {
      sawForbidden = true;
      continue;
    }
  }

  if (sawNotFound && !sawForbidden) {
    return true;
  }

  return false;
}

/** Returns Google Calendar web URL for an event (calendarId::eventId). For redirects. */
export async function getCalendarEventWebUrl(input: {
  userId: string;
  calendarEventRef: string;
}): Promise<string> {
  const parsed = parseCalendarEventRef(input.calendarEventRef.trim());
  if (!parsed.calendarId || !parsed.eventId) {
    return "https://www.google.com/calendar";
  }

  const fallbackUrl = buildGoogleCalendarEventFallbackUrl(parsed.calendarId, parsed.eventId);
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return fallbackUrl;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(parsed.calendarId)}/events/${encodeURIComponent(parsed.eventId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      }
    );
    if (!response.ok) {
      return fallbackUrl;
    }
    const payload = (await response.json()) as { htmlLink?: string };
    const url = payload.htmlLink?.trim();
    if (url && isGoogleCalendarUrl(url)) {
      return url;
    }
    return fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

function buildGoogleCalendarEventFallbackUrl(calendarId: string, eventId: string) {
  const encoded = Buffer.from(`${eventId} ${calendarId}`, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `https://www.google.com/calendar/event?${new URLSearchParams({ eid: encoded }).toString()}`;
}

function isGoogleCalendarUrl(value: string) {
  try {
    const u = new URL(value);
    return u.hostname === "calendar.google.com" || (u.hostname === "www.google.com" && u.pathname.startsWith("/calendar"));
  } catch {
    return false;
  }
}

export async function syncPublicEventsFromGoogleCalendar(userId: string) {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return { synced: 0, scanned: 0 };
  }

  const [alleGroup, settings] = await Promise.all([
    ensureAlleGroupForUser(userId),
    getUserSuggestionSettings(userId)
  ]);

  const now = new Date();
  const timeMax = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  let scanned = 0;
  let synced = 0;
  const seenSourceEventIds = new Set<string>();
  const allCalendarIds = await listReadableCalendarIds(token);
  const calendarIds = filterConfiguredCalendarIds(allCalendarIds, settings.matchingCalendarIds);
  let forbiddenCalendars = 0;
  let forbiddenDetail: string | null = null;

  for (const calendarId of calendarIds) {
    let pageToken: string | undefined;
    let skipCalendar = false;

    do {
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: "250"
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const details = await readGoogleError(response);
        if (response.status === 403 || response.status === 404) {
          forbiddenCalendars += 1;
          if (!forbiddenDetail && details) {
            forbiddenDetail = details;
          }
          skipCalendar = true;
          break;
        }

        throw new Error(
          `Kalender-Sync fehlgeschlagen (${response.status})${details ? `: ${details}` : ""}`
        );
      }

      const payload = (await response.json()) as {
        items?: CalendarApiEvent[];
        nextPageToken?: string;
      };

      const items = payload.items ?? [];

      scanned += items.length;

      for (const item of items) {
        if (!item.id) {
          continue;
        }

        if (isRealiteManagedCalendarEvent(item)) {
          continue;
        }

        if (!containsAlleTagInTitle(item.summary)) {
          continue;
        }

        const importedDescription = stripRealiteCalendarMetadata(item.description ?? null);
        const searchableText = `${item.summary ?? ""}\n${importedDescription ?? ""}`;
        const tags = extractTags(searchableText);

        const startsAt = parseGoogleEventDate(item.start);
        const endsAt = parseGoogleEventDate(item.end);

        if (!startsAt || !endsAt || endsAt <= startsAt) {
          continue;
        }

        const sourceEventId = `${calendarId}:${item.id}`;
        seenSourceEventIds.add(sourceEventId);

        const importedEvent = await upsertExternalPublicEvent({
          userId,
          sourceProvider: "google",
          sourceEventId,
          title: item.summary?.trim() || "Öffentliches Kalender-Event",
          description: importedDescription,
          location: item.location ?? null,
          startsAt,
          endsAt,
          groupId: alleGroup.id,
          tags
        });

        try {
          await ensureGoogleEventHasRealiteLink({
            token,
            calendarId,
            googleEventId: item.id,
            currentDescription: item.description ?? null,
            url: buildRealiteEventUrl(importedEvent.id),
            linkType: "event"
          });
        } catch (error) {
          console.error(
            `Realite-Link für Google-Event ${sourceEventId} konnte nicht ergänzt werden`,
            error instanceof Error ? error.message : error
          );
        }

        if (importedDescription?.trim()) {
          void fetchOgImageFromText(importedDescription).then((url) => {
            if (url) {
              return updateEventImageUrls(importedEvent.id, { linkPreviewImageUrl: url });
            }
          });
        }

        synced += 1;
      }

      pageToken = payload.nextPageToken;
    } while (pageToken);

    if (skipCalendar) {
      continue;
    }
  }

  if (calendarIds.length > 0 && forbiddenCalendars === calendarIds.length) {
    if (forbiddenDetail?.toLowerCase().includes("insufficient authentication scopes")) {
      throw new Error(
        "Google-Token hat nicht genug Kalender-Rechte. Bitte Google-Zugriff für diese App in deinem Google-Konto entfernen und danach erneut anmelden."
      );
    }

    throw new Error(
      `Google Kalenderzugriff verweigert (403)${
        forbiddenDetail ? `: ${forbiddenDetail}` : ""
      }. Bitte einmal abmelden und erneut mit Google anmelden.`
    );
  }

  const externalEvents = await listExternalSourceEventsForUser({
    userId,
    sourceProvider: "google"
  });

  const staleEventIds = externalEvents
    .filter((event) => event.sourceEventId && !seenSourceEventIds.has(event.sourceEventId))
    .map((event) => event.id);

  if (staleEventIds.length) {
    const staleSuggestions = await listSuggestionCalendarRefsByEventIds(staleEventIds);
    for (const suggestion of staleSuggestions) {
      if (!suggestion.calendarEventId) {
        continue;
      }

      await removeSuggestionCalendarEvent({
        userId: suggestion.userId,
        calendarEventRef: suggestion.calendarEventId
      });
    }

    await deleteEventsByIds(staleEventIds);
  }

  return { synced, scanned };
}

async function listCalendarsByAccessRole(token: string, accessRole: "reader" | "writer") {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=${accessRole}&showHidden=false&maxResults=250`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return [
      {
        id: "primary",
        summary: "Primary",
        primary: true
      }
    ] as ReadableGoogleCalendar[];
  }

  const payload = (await response.json()) as {
    items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
  };

  const calendars: ReadableGoogleCalendar[] = [];
  for (const item of payload.items ?? []) {
    if (!item.id) {
      continue;
    }

    calendars.push({
      id: item.id,
      summary: item.summary?.trim() || (item.primary ? "Primary" : item.id),
      primary: Boolean(item.primary)
    });
  }

  if (!calendars.length) {
    return [
      {
        id: "primary",
        summary: "Primary",
        primary: true
      }
    ] as ReadableGoogleCalendar[];
  }

  return calendars.sort((a, b) => {
    if (a.primary && !b.primary) {
      return -1;
    }
    if (!a.primary && b.primary) {
      return 1;
    }
    return a.summary.localeCompare(b.summary);
  });
}

async function listReadableCalendarIds(token: string) {
  const calendars = await listCalendarsByAccessRole(token, "reader");
  const ids = calendars.map((calendar) => calendar.id).filter(Boolean);
  return ids.length ? ids : ["primary"];
}

export async function listReadableCalendars(userId: string) {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return [] as ReadableGoogleCalendar[];
  }

  return listCalendarsByAccessRole(token, "reader");
}

export async function listWritableCalendars(userId: string) {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return [] as WritableGoogleCalendar[];
  }

  const calendars = await listCalendarsByAccessRole(token, "writer");
  return calendars as WritableGoogleCalendar[];
}

/** TTL for push channel: 6 days (Google max is 7); renew before expiry. */
const CALENDAR_WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000;
const CALENDAR_WATCH_RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

/**
 * Register a Google Calendar push channel for a calendar. On change, Google POSTs to our webhook.
 */
export async function registerCalendarWatch(
  userId: string,
  calendarId: string
): Promise<{ channelId: string; resourceId: string; expirationMs: number } | null> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return null;
  }

  const baseUrl = getRealiteBaseUrl();
  const webhookUrl = `${baseUrl}/api/webhooks/google-calendar`;
  const channelId = crypto.randomUUID();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        expiration: Date.now() + CALENDAR_WATCH_TTL_MS,
      }),
    }
  );

  if (!response.ok) {
    const details = await readGoogleError(response);
    console.error(
      `Calendar watch registration failed for user ${userId} calendar ${calendarId}: ${response.status}`,
      details ?? ""
    );
    return null;
  }

  const payload = (await response.json()) as {
    id?: string;
    resourceId?: string;
    expiration?: number;
  };

  const resourceId = payload.resourceId ?? "";
  const expirationMs = typeof payload.expiration === "number" ? payload.expiration : Date.now() + CALENDAR_WATCH_TTL_MS;

  await insertCalendarWatchChannel({
    userId,
    calendarId,
    channelId,
    resourceId,
    expirationMs,
  });

  return { channelId, resourceId, expirationMs };
}

/**
 * Stop a calendar push channel (e.g. when user disconnects or calendar is removed).
 */
export async function stopCalendarWatch(
  userId: string,
  channelId: string,
  resourceId: string
): Promise<boolean> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return false;
  }

  const response = await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });

  if (!response.ok) {
    const details = await readGoogleError(response);
    console.error(`Calendar watch stop failed for channel ${channelId}:`, response.status, details ?? "");
    return false;
  }

  return true;
}

/**
 * Ensure push channels exist for all of the user's configured calendars; remove watches for
 * calendars no longer configured; renew channels that expire soon.
 */
export async function ensureCalendarWatchesForUser(userId: string): Promise<void> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    await deleteCalendarWatchChannelsByUserId(userId);
    return;
  }

  const [allCalendarIds, settings, existingChannels] = await Promise.all([
    listReadableCalendarIds(token),
    getUserSuggestionSettings(userId),
    listCalendarWatchChannelsByUserId(userId),
  ]);

  const targetCalendarIds = filterConfiguredCalendarIds(allCalendarIds, settings.matchingCalendarIds);
  const now = Date.now();
  const renewThreshold = now + CALENDAR_WATCH_RENEW_BEFORE_MS;

  const byCalendar = new Map(existingChannels.map((c) => [c.calendarId, c]));

  for (const row of existingChannels) {
    if (!targetCalendarIds.includes(row.calendarId)) {
      const stopped = await stopCalendarWatch(userId, row.channelId, row.resourceId);
      if (stopped) {
        await deleteCalendarWatchChannelById(row.id);
      }
    }
  }

  for (const calendarId of targetCalendarIds) {
    const existing = byCalendar.get(calendarId);
    const expiresSoon = existing ? existing.expirationMs < renewThreshold : true;

    if (!existing || expiresSoon) {
      if (existing) {
        await stopCalendarWatch(userId, existing.channelId, existing.resourceId);
        await deleteCalendarWatchChannelById(existing.id);
      }

      await registerCalendarWatch(userId, calendarId);
    }
  }
}
