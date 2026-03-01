import { describe, expect, test } from "bun:test";

import { createGoogleCalendarWriteService } from "@/src/lib/google-calendar";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("google calendar write service", () => {
  test("adds a Realite suggestion link when creating a calendar copy", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const service = createGoogleCalendarWriteService({
      fetchFn: async (url, init) => {
        const href = String(url);
        calls.push({ url: href, init });

        if (href.includes("privateExtendedProperty=")) {
          return jsonResponse({ items: [] });
        }

        if (href.includes("/events?sendUpdates=none")) {
          return jsonResponse({ id: "created-event" });
        }

        throw new Error(`Unhandled fetch: ${href}`);
      },
      getAccessToken: async () => "token-1",
      getUserById: async () => null,
    });

    const calendarEventRef = await service.insertSuggestionIntoCalendar({
      userId: "user-1",
      suggestionId: "123e4567-e89b-12d3-a456-426614174000",
      eventId: "123e4567-e89b-12d3-a456-426614174001",
      title: "Padel Feierabend",
      description: "Bitte Schläger mitbringen.",
      location: "Padel Club",
      startsAt: new Date("2026-03-02T18:00:00.000Z"),
      endsAt: new Date("2026-03-02T19:00:00.000Z"),
      calendarId: "primary",
    });

    const postCall = calls.find((call) =>
      call.url.includes("/events?sendUpdates=none"),
    );
    const payload = JSON.parse(String(postCall?.init?.body));

    expect(calendarEventRef).toBe("primary::created-event");
    expect(payload.summary).toBe("[Realite Vorschlag] Padel Feierabend");
    expect(payload.description).toContain("Bitte Schläger mitbringen.");
    expect(payload.description).toContain(
      "Realite-Link (automatisch ergänzt): https://realite.app/s/",
    );
    expect(payload.extendedProperties.private.realiteSuggestionId).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    );
  });

  test("creates smart meeting calendar events with normalized invitees and event link", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const service = createGoogleCalendarWriteService({
      fetchFn: async (url, init) => {
        const href = String(url);
        calls.push({ url: href, init });
        return jsonResponse({ id: "meeting-1" });
      },
      getAccessToken: async () => "token-2",
      getUserById: async () => null,
    });

    const calendarEventRef = await service.insertGroupMeetingIntoCalendar({
      userId: "owner-1",
      eventId: "123e4567-e89b-12d3-a456-426614174010",
      title: "Team Dinner",
      description: "Reservierung auf Max",
      startsAt: new Date("2026-03-03T18:00:00.000Z"),
      endsAt: new Date("2026-03-03T20:00:00.000Z"),
      attendeeEmails: [
        " Alice@example.com ",
        "bob@example.com",
        "alice@example.com",
      ],
      calendarId: "team-cal",
    });

    const payload = JSON.parse(String(calls[0]?.init?.body));

    expect(calendarEventRef).toBe("team-cal::meeting-1");
    expect(payload.attendees).toEqual([
      { email: "alice@example.com", responseStatus: "needsAction" },
      { email: "bob@example.com", responseStatus: "needsAction" },
    ]);
    expect(payload.description).toContain(
      "Realite-Link (automatisch ergänzt): https://realite.app/e/",
    );
    expect(payload.extendedProperties.private.realiteManagedType).toBe(
      "smart_meeting",
    );
  });

  test("adds a missing attendee to a source event and sends updates", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const service = createGoogleCalendarWriteService({
      fetchFn: async (url, init) => {
        const href = String(url);
        calls.push({ url: href, init });

        if (!init?.method || init.method === "GET") {
          return jsonResponse({
            attendees: [{ email: "existing@example.com", responseStatus: "accepted" }],
          });
        }

        return jsonResponse({});
      },
      getAccessToken: async () => "token-3",
      getUserById: async () => null,
    });

    const ok = await service.addAttendeeToSourceEvent({
      ownerUserId: "owner-2",
      sourceEventId: "source-cal::event-42".replace("::", ":"),
      attendeeEmail: " new@example.com ",
    });

    const patchCall = calls.find((call) => call.init?.method === "PATCH");
    const payload = JSON.parse(String(patchCall?.init?.body));

    expect(ok).toBe(true);
    expect(String(patchCall?.url)).toContain("sendUpdates=all");
    expect(payload.attendees).toEqual([
      { email: "existing@example.com", responseStatus: "accepted" },
      { email: "new@example.com", responseStatus: "needsAction" },
    ]);
  });

  test("maps attendee response statuses from the calendar event", async () => {
    const service = createGoogleCalendarWriteService({
      fetchFn: async () =>
        jsonResponse({
          attendees: [
            { email: "alice@example.com", responseStatus: "accepted" },
            { email: "bob@example.com", responseStatus: "declined" },
            { email: "carol@example.com", responseStatus: "tentative" },
          ],
        }),
      getAccessToken: async () => "token-4",
      getUserById: async () => null,
    });

    const responses = await service.getCalendarAttendeeResponses({
      userId: "viewer-1",
      calendarEventRef: "primary::event-77",
      attendeeEmails: [
        "alice@example.com",
        "bob@example.com",
        "carol@example.com",
        "dave@example.com",
      ],
    });

    expect(responses).toEqual([
      { email: "alice@example.com", responseStatus: "accepted" },
      { email: "bob@example.com", responseStatus: "declined" },
      { email: "carol@example.com", responseStatus: "tentative" },
      { email: "dave@example.com", responseStatus: "needsAction" },
    ]);
  });
});
