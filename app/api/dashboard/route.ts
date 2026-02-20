import { NextResponse } from "next/server";

import { syncPublicEventsFromGoogleCalendar } from "@/src/lib/google-calendar";
import { syncGoogleContactsToGroups } from "@/src/lib/google-contacts";
import { buildAvailabilityMap } from "@/src/lib/matcher";
import {
  getGoogleConnection,
  listGroupContactsForUser,
  listGroupsForUser,
  listSuggestionsForUser,
  listVisibleEventsForUser
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  let syncWarning: string | null = null;
  let syncStats: { synced: number; scanned: number } | null = null;
  let contactsSyncWarning: string | null = null;
  let contactsSyncStats: { syncedGroups: number; syncedMembers: number; scannedContacts: number } | null = null;

  try {
    syncStats = await syncPublicEventsFromGoogleCalendar(user.id);
  } catch (error) {
    syncWarning = error instanceof Error ? error.message : "Kalender-Sync fehlgeschlagen";
  }

  try {
    contactsSyncStats = await syncGoogleContactsToGroups(user.id);
  } catch (error) {
    contactsSyncWarning = error instanceof Error ? error.message : "Kontakte-Sync fehlgeschlagen";
  }

  const [groups, events, suggestions, connection, groupContacts] = await Promise.all([
    listGroupsForUser(user.id),
    listVisibleEventsForUser(user.id),
    listSuggestionsForUser(user.id),
    getGoogleConnection(user.id),
    listGroupContactsForUser(user.id)
  ]);

  const availability = await buildAvailabilityMap(user.id, events);
  const groupEventCounts = new Map<string, number>();
  const contactsByGroup = new Map<string, Awaited<ReturnType<typeof listGroupContactsForUser>>>();

  for (const event of events) {
    if (!event.groupId) {
      continue;
    }

    const current = groupEventCounts.get(event.groupId) ?? 0;
    groupEventCounts.set(event.groupId, current + 1);
  }

  for (const contact of groupContacts) {
    const current = contactsByGroup.get(contact.groupId) ?? [];
    current.push(contact);
    contactsByGroup.set(contact.groupId, current);
  }

  return NextResponse.json({
    me: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      calendarConnected: Boolean(connection),
      calendarScope: connection?.scope ?? null
    },
    sync: {
      warning: syncWarning,
      stats: syncStats,
      contactsWarning: contactsSyncWarning,
      contactsStats: contactsSyncStats
    },
    groups: groups.map((group) => ({
      ...group,
      createdAt: group.createdAt.toISOString(),
      eventCount: groupEventCounts.get(group.id) ?? 0,
      contactCount: contactsByGroup.get(group.id)?.length ?? 0,
      contacts: contactsByGroup.get(group.id) ?? []
    })),
    events: events.map((event) => ({
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      isAvailable: availability.get(event.id) ?? true
    })),
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      startsAt: suggestion.startsAt.toISOString(),
      endsAt: suggestion.endsAt.toISOString(),
      createdAt: suggestion.createdAt.toISOString()
    }))
  });
}
