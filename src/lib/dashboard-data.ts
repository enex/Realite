import { getDashboardSyncSnapshot, triggerDashboardBackgroundSync } from "@/src/lib/background-sync";
import { ensureCalendarWatchesForUser } from "@/src/lib/google-calendar";
import {
  getAcceptedUsersForEventIds,
  getDateHashtagStatus,
  getGoogleConnection,
  listGroupContactsForUser,
  listGroupsForUser,
  listSuggestionsForUser,
  listVisibleEventsForUser
} from "@/src/lib/repository";
import { listSmartMeetingsForUser } from "@/src/lib/smart-meetings";

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export async function buildDashboardPayload(user: DashboardUser) {
  triggerDashboardBackgroundSync(user.id);
  ensureCalendarWatchesForUser(user.id).catch((err) => {
    console.error("Calendar watch ensure failed for user", user.id, err);
  });
  const syncState = getDashboardSyncSnapshot(user.id);

  const [groups, events, suggestions, connection, groupContacts, dating, smartMeetings] = await Promise.all([
    listGroupsForUser(user.id),
    listVisibleEventsForUser(user.id),
    listSuggestionsForUser(user.id),
    getGoogleConnection(user.id),
    listGroupContactsForUser(user.id),
    getDateHashtagStatus(user.id),
    listSmartMeetingsForUser(user.id)
  ]);

  const acceptedByEventId = await getAcceptedUsersForEventIds(events.map((event) => event.id));
  const acceptedByEventIdJson: Record<string, { name: string | null; email: string }[]> = {};

  for (const [eventId, list] of acceptedByEventId) {
    acceptedByEventIdJson[eventId] = list;
  }

  const ownEmail = user.email.trim().toLowerCase();
  const groupEventCounts = new Map<string, number>();
  const contactsByGroup = new Map<string, typeof groupContacts>();

  for (const event of events) {
    if (!event.groupId) {
      continue;
    }

    groupEventCounts.set(event.groupId, (groupEventCounts.get(event.groupId) ?? 0) + 1);
  }

  for (const contact of groupContacts) {
    const isOwnContact = contact.emails.some((email) => email.trim().toLowerCase() === ownEmail);
    if (isOwnContact) {
      continue;
    }

    const current = contactsByGroup.get(contact.groupId) ?? [];
    current.push(contact);
    contactsByGroup.set(contact.groupId, current);
  }

  return {
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
      smartWarning: syncState.smartWarning,
      smartStats: syncState.smartStats,
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
    })),
    acceptedByEventId: acceptedByEventIdJson,
    smartMeetings: smartMeetings.map((meeting) => ({
      ...meeting,
      searchWindowStart: meeting.searchWindowStart.toISOString(),
      searchWindowEnd: meeting.searchWindowEnd.toISOString(),
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      latestRun: meeting.latestRun
        ? {
            ...meeting.latestRun,
            startsAt: meeting.latestRun.startsAt.toISOString(),
            endsAt: meeting.latestRun.endsAt.toISOString(),
            responseDeadlineAt: meeting.latestRun.responseDeadlineAt.toISOString()
          }
        : null
    }))
  };
}

export function buildDashboardRefreshPayload(userId: string) {
  triggerDashboardBackgroundSync(userId, { force: true });
  const syncState = getDashboardSyncSnapshot(userId);

  return {
    ok: true,
    sync: {
      warning: syncState.warning,
      stats: syncState.stats,
      contactsWarning: syncState.contactsWarning,
      contactsStats: syncState.contactsStats,
      smartWarning: syncState.smartWarning,
      smartStats: syncState.smartStats,
      revalidating: syncState.revalidating,
      lastTriggeredAt: syncState.lastTriggeredAt,
      lastCompletedAt: syncState.lastCompletedAt
    }
  };
}
