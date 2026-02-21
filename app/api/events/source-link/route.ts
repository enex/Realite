import { NextResponse } from "next/server";
import { z } from "zod";

import { getGoogleAccessToken } from "@/src/lib/google-calendar";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

const requestQuerySchema = z.object({
  sourceProvider: z.string().trim().min(1),
  sourceEventId: z.string().trim().min(1)
});

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

  const params = new URLSearchParams({
    eid: encodedEventRef
  });

  return `https://www.google.com/calendar/event?${params.toString()}`;
}

function isGoogleCalendarUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "calendar.google.com") {
      return true;
    }

    return url.hostname === "www.google.com" && url.pathname.startsWith("/calendar");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const parsedQuery = requestQuerySchema.safeParse({
    sourceProvider: requestUrl.searchParams.get("sourceProvider") ?? "",
    sourceEventId: requestUrl.searchParams.get("sourceEventId") ?? ""
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (parsedQuery.data.sourceProvider !== "google") {
    return NextResponse.json({ error: "Nur Google Events werden unterstützt" }, { status: 400 });
  }

  const parsedSource = parseGoogleSourceEventId(parsedQuery.data.sourceEventId);
  if (!parsedSource) {
    return NextResponse.json({ error: "Ungültige Event-Referenz" }, { status: 400 });
  }

  const fallbackUrl = buildGoogleFallbackUrl(parsedSource.calendarId, parsedSource.eventId);
  const accessToken = await getGoogleAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const detailsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(parsedSource.calendarId)}` +
        `/events/${encodeURIComponent(parsedSource.eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        cache: "no-store"
      }
    );

    if (!detailsResponse.ok) {
      return NextResponse.redirect(fallbackUrl);
    }

    const payload = (await detailsResponse.json()) as { htmlLink?: string };
    const targetUrl = payload.htmlLink?.trim();

    if (targetUrl && isGoogleCalendarUrl(targetUrl)) {
      return NextResponse.redirect(targetUrl);
    }

    return NextResponse.redirect(fallbackUrl);
  } catch {
    return NextResponse.redirect(fallbackUrl);
  }
}
