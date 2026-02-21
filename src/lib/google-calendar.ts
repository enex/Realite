import {
  deleteEventsByIds,
  ensureAlleGroupForUser,
  getGoogleConnection,
  getUserSuggestionSettings,
  getUserById,
  listExternalSourceEventsForUser,
  listSuggestionCalendarRefsByEventIds,
  updateGoogleConnectionTokens,
  upsertExternalPublicEvent
} from "@/src/lib/repository";

type BusyWindow = {
  start: string;
  end: string;
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

  const baseUrl =
    process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || process.env.REALITE_APP_URL || "https://realite.app";
  const realiteUrl = `${baseUrl.replace(/\/+$/, "")}/?suggestion=${encodeURIComponent(input.suggestionId)}`;
  const acceptUrl = `${realiteUrl}&decision=accepted`;
  const declineUrl = `${realiteUrl}&decision=declined`;
  const eventPayload = {
    summary: `[Realite] ${input.title.replace(/^\[realite\]\s*/iu, "")}`,
    description:
      `${input.description ?? ""}\n\nVorschlag von Realite.\nIn Realite öffnen: ${realiteUrl}\nZusage: ${acceptUrl}\nAbsage: ${declineUrl}`.trim(),
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
    const patchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.eventId)}?sendUpdates=none`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ transparency })
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

    if (response.status === 404 || response.status === 403) {
      continue;
    }
  }

  return false;
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

        const searchableText = `${item.summary ?? ""}\n${item.description ?? ""}`;
        const tags = extractTags(searchableText);

        const startsAt = parseGoogleEventDate(item.start);
        const endsAt = parseGoogleEventDate(item.end);

        if (!startsAt || !endsAt || endsAt <= startsAt) {
          continue;
        }

        const sourceEventId = `${calendarId}:${item.id}`;
        seenSourceEventIds.add(sourceEventId);

        await upsertExternalPublicEvent({
          userId,
          sourceProvider: "google",
          sourceEventId,
          title: item.summary?.trim() || "Öffentliches Kalender-Event",
          description: item.description ?? null,
          location: item.location ?? null,
          startsAt,
          endsAt,
          groupId: alleGroup.id,
          tags
        });

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
