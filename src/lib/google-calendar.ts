import {
  ensureAlleGroupForUser,
  getGoogleConnection,
  updateGoogleConnectionTokens,
  upsertExternalPublicEvent
} from "@/src/lib/repository";

type BusyWindow = {
  start: string;
  end: string;
};

const FREE_BUSY_CHUNK_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_FREE_BUSY_SPLIT_DEPTH = 8;

type CalendarApiEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
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

function parseGoogleEventDate(value?: { dateTime?: string; date?: string }) {
  if (value?.dateTime) {
    return new Date(value.dateTime);
  }

  if (value?.date) {
    return new Date(`${value.date}T00:00:00.000Z`);
  }

  return null;
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
    return [] as BusyWindow[];
  }

  if (input.timeMax <= input.timeMin) {
    return [] as BusyWindow[];
  }

  const allWindows: BusyWindow[] = [];
  let cursor = new Date(input.timeMin);

  while (cursor < input.timeMax) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + FREE_BUSY_CHUNK_MS, input.timeMax.getTime()));
    const busy = await fetchBusyWindowsWithSplit(token, cursor, chunkEnd, 0);

    // Ohne FreeBusy-Berechtigung fällt die App auf "best effort" zurück,
    // statt das Dashboard hart scheitern zu lassen.
    if (busy === null) {
      return [] as BusyWindow[];
    }

    allWindows.push(...busy);
    cursor = chunkEnd;
  }

  return mergeBusyWindows(allWindows);
}

async function fetchBusyWindowsWithSplit(
  token: string,
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
      items: [{ id: "primary" }]
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

      const left = await fetchBusyWindowsWithSplit(token, timeMin, middle, depth + 1);
      if (left === null) {
        return null;
      }

      const right = await fetchBusyWindowsWithSplit(token, middle, timeMax, depth + 1);
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
    calendars?: {
      primary?: {
        busy?: BusyWindow[];
      };
    };
  };

  return data.calendars?.primary?.busy ?? ([] as BusyWindow[]);
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
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
}) {
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return null;
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: `[Realite] ${input.title}`,
        description:
          `${input.description ?? ""}\n\nVorschlag von Realite. Bitte in der App Zu- oder Absagen.`.trim(),
        location: input.location ?? undefined,
        start: {
          dateTime: input.startsAt.toISOString()
        },
        end: {
          dateTime: input.endsAt.toISOString()
        },
        extendedProperties: {
          private: {
            realiteSuggestionId: input.suggestionId
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Kalendereintrag fehlgeschlagen (${response.status})`);
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

export async function syncPublicEventsFromGoogleCalendar(userId: string) {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return { synced: 0, scanned: 0 };
  }

  const alleGroup = await ensureAlleGroupForUser(userId);

  const now = new Date();
  const timeMax = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  let scanned = 0;
  let synced = 0;
  const calendarIds = await listReadableCalendarIds(token);
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

        await upsertExternalPublicEvent({
          userId,
          sourceProvider: "google",
          sourceEventId: `${calendarId}:${item.id}`,
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

  return { synced, scanned };
}

async function listReadableCalendarIds(token: string) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&showHidden=false&maxResults=250",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return ["primary"];
  }

  const payload = (await response.json()) as {
    items?: Array<{ id?: string }>;
  };

  const ids = (payload.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
  return ids.length ? ids : ["primary"];
}
