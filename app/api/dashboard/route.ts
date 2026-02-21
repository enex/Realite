import { NextResponse } from "next/server";

import { getDashboardSyncSnapshot, triggerDashboardBackgroundSync } from "@/src/lib/background-sync";
import {
  getDateHashtagStatus,
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

  triggerDashboardBackgroundSync(user.id);
  const syncState = getDashboardSyncSnapshot(user.id);

  const [groups, events, suggestions, connection, groupContacts, dating] = await Promise.all([
    listGroupsForUser(user.id),
    listVisibleEventsForUser(user.id),
    listSuggestionsForUser(user.id),
    getGoogleConnection(user.id),
    listGroupContactsForUser(user.id),
    getDateHashtagStatus(user.id)
  ]);
  const ownEmail = user.email.trim().toLowerCase();

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
    if (contact.email.trim().toLowerCase() === ownEmail) {
      continue;
    }

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
      warning: syncState.warning,
      stats: syncState.stats,
      contactsWarning: syncState.contactsWarning,
      contactsStats: syncState.contactsStats,
      revalidating: syncState.revalidating,
      lastTriggeredAt: syncState.lastTriggeredAt,
      lastCompletedAt: syncState.lastCompletedAt
    },
    dating: {
      enabled: dating.profile.enabled,
      unlocked: dating.unlocked,
      missingRequirements: dating.missingRequirements
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
      isAvailable: true
    })),
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      startsAt: suggestion.startsAt.toISOString(),
      endsAt: suggestion.endsAt.toISOString(),
      createdAt: suggestion.createdAt.toISOString()
    }))
  });
}
