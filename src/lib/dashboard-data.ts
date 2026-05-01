import { getDashboardSyncSnapshot, triggerDashboardBackgroundSync } from "@/src/lib/background-sync";
import { deriveCalendarConnectionState } from "@/src/lib/calendar-connection-state";
import { ensureCalendarWatchesForUser, listReadableCalendars, listWritableCalendars } from "@/src/lib/google-calendar";
import {
  getAcceptedUsersForEventIds,
  getDateHashtagStatus,
  getGoogleConnection,
  getWeeklyShareCampaignSummary,
  listGroupContactsForUser,
  listGroupsForUser,
  listSuggestionsForUser,
  listVisibleEventsForUser
} from "@/src/lib/repository";
import {
  mapResolveProfileImageField,
  resolveProfileImageReadUrl,
} from "@/src/lib/profile-image-storage";
import { listSmartMeetingsForUser } from "@/src/lib/smart-meetings";

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export function toDashboardIsoString(value: Date | string | number) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableDashboardIsoString(value: Date | string | number | null) {
  return value === null ? null : toDashboardIsoString(value);
}

export async function buildDashboardPayload(user: DashboardUser) {
  triggerDashboardBackgroundSync(user.id);
  ensureCalendarWatchesForUser(user.id).catch((err) => {
    console.error("Calendar watch ensure failed for user", user.id, err);
  });
  const syncState = getDashboardSyncSnapshot(user.id);

  const [groups, events, suggestions, connection, groupContacts, dating, smartMeetings, writableCalendars, readableCalendars, weeklyShare] = await Promise.all([
    listGroupsForUser(user.id),
    listVisibleEventsForUser(user.id),
    listSuggestionsForUser(user.id),
    getGoogleConnection(user.id),
    listGroupContactsForUser(user.id),
    getDateHashtagStatus(user.id),
    listSmartMeetingsForUser(user.id),
    listWritableCalendars(user.id),
    listReadableCalendars(user.id),
    getWeeklyShareCampaignSummary(user.id)
  ]);
  const calendarConnectionState = deriveCalendarConnectionState({
    hasConnection: Boolean(connection),
    providerId: connection?.provider ?? null,
    scope: connection?.scope ?? null,
    writableCalendarCount: writableCalendars.length,
    readableCalendarCount: readableCalendars.length
  });

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

  const resolvedContactsByGroupEntries = await Promise.all(
    [...contactsByGroup.entries()].map(async ([groupId, contacts]) => {
      const resolved = await Promise.all(contacts.map(mapResolveProfileImageField));
      return [groupId, resolved] as const;
    }),
  );
  const resolvedContactsByGroup = new Map(resolvedContactsByGroupEntries);

  const knownVisitorsResolved = await Promise.all(
    weeklyShare.knownVisitors.map(mapResolveProfileImageField),
  );
  const pendingReferralsResolved = await Promise.all(
    weeklyShare.pendingReferrals.map(mapResolveProfileImageField),
  );

  return {
    me: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: await resolveProfileImageReadUrl(user.image),
      calendarConnected: calendarConnectionState === "connected",
      calendarConnectionState,
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
      createdAt: toDashboardIsoString(group.createdAt),
      eventCount: groupEventCounts.get(group.id) ?? 0,
      contactCount: resolvedContactsByGroup.get(group.id)?.length ?? 0,
      contacts: resolvedContactsByGroup.get(group.id) ?? []
    })),
    events: events.map((event) => ({
      ...event,
      startsAt: toDashboardIsoString(event.startsAt),
      endsAt: toDashboardIsoString(event.endsAt),
      isAvailable: true
    })),
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      startsAt: toDashboardIsoString(suggestion.startsAt),
      endsAt: toDashboardIsoString(suggestion.endsAt),
      createdAt: toDashboardIsoString(suggestion.createdAt)
    })),
    weeklyShare: {
      ...weeklyShare,
      weekStartsOn: toDashboardIsoString(weeklyShare.weekStartsOn),
      openIntentions: weeklyShare.openIntentions,
      sharedAt: toNullableDashboardIsoString(weeklyShare.sharedAt),
      dismissedAt: toNullableDashboardIsoString(weeklyShare.dismissedAt),
      knownVisitors: knownVisitorsResolved.map((visitor) => ({
        ...visitor,
        firstVisitedAt: toDashboardIsoString(visitor.firstVisitedAt),
        lastVisitedAt: toDashboardIsoString(visitor.lastVisitedAt)
      })),
      pendingReferrals: pendingReferralsResolved.map((referral) => ({
        ...referral,
        createdAt: toDashboardIsoString(referral.createdAt)
      }))
    },
    acceptedByEventId: acceptedByEventIdJson,
    smartMeetings: smartMeetings.map((meeting) => ({
      ...meeting,
      searchWindowStart: toDashboardIsoString(meeting.searchWindowStart),
      searchWindowEnd: toDashboardIsoString(meeting.searchWindowEnd),
      createdAt: toDashboardIsoString(meeting.createdAt),
      updatedAt: toDashboardIsoString(meeting.updatedAt),
      latestRun: meeting.latestRun
        ? {
            ...meeting.latestRun,
            startsAt: toDashboardIsoString(meeting.latestRun.startsAt),
            endsAt: toDashboardIsoString(meeting.latestRun.endsAt),
            responseDeadlineAt: toDashboardIsoString(meeting.latestRun.responseDeadlineAt)
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
