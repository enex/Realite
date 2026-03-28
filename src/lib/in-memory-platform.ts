import {
  type CalendarProvider,
  type BusyWindow,
} from "@/src/lib/google-calendar";
import {
  type ContactsProvider,
  type ContactsSnapshot,
  type ContactsSyncRepository,
} from "@/src/lib/google-contacts";
import {
  type MatcherRepository,
  type MatcherSuggestionRecord,
  type MatcherSuggestionState,
} from "@/src/lib/matcher";
import {
  type SuggestionStatus,
  type UserSuggestionSettings,
  type VisibleEvent,
} from "@/src/lib/repository";

function createDefaultSuggestionSettings(): UserSuggestionSettings {
  return {
    autoInsertSuggestions: true,
    suggestionCalendarId: "primary",
    suggestionDeliveryMode: "calendar_copy",
    shareEmailInSourceInvites: true,
    matchingCalendarIds: [],
    blockedCreatorIds: [],
    blockedActivityTags: [],
    suggestionLimitPerDay: 4,
    suggestionLimitPerWeek: 16,
  };
}

type StoredGroup = {
  id: string;
  userId: string;
  name: string;
  resourceName: string;
  hashtags: string[];
};

export class InMemoryCalendarProvider implements CalendarProvider {
  busyWindowsByUser = new Map<string, BusyWindow[] | null>();
  insertedSuggestions = [] as Array<{
    userId: string;
    suggestionId: string;
    eventId: string;
    calendarId: string;
    blockedCalendarIds: string[];
  }>;
  ensuredSuggestions = [] as Array<{
    userId: string;
    calendarEventRef: string;
    eventId: string;
  }>;
  removedSuggestionEvents = [] as Array<{
    userId: string;
    calendarEventRef: string;
    preferredCalendarId: string | null;
  }>;
  syncPublicEventsCalls = [] as string[];
  syncPublicEventsResultByUser = new Map<
    string,
    { synced: number; scanned: number }
  >();

  async getBusyWindows(input: {
    userId: string;
    timeMin: Date;
    timeMax: Date;
  }) {
    if (!this.busyWindowsByUser.has(input.userId)) {
      return [];
    }

    return this.busyWindowsByUser.get(input.userId) ?? null;
  }

  async insertSuggestionIntoCalendar(input: {
    userId: string;
    suggestionId: string;
    eventId: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: Date;
    endsAt: Date;
    calendarId: string;
    blockedCalendarIds?: string[];
    linkType?: "suggestion" | "event";
  }) {
    this.insertedSuggestions.push({
      userId: input.userId,
      suggestionId: input.suggestionId,
      eventId: input.eventId,
      calendarId: input.calendarId,
      blockedCalendarIds: [...(input.blockedCalendarIds ?? [])],
    });

    return `calendar:${input.suggestionId}`;
  }

  async ensureSuggestionNonBusyInCalendar(input: {
    userId: string;
    calendarEventRef: string;
    eventId: string;
  }) {
    this.ensuredSuggestions.push(input);
    return true;
  }

  async removeSuggestionCalendarEvent(input: {
    userId: string;
    calendarEventRef: string;
    preferredCalendarId?: string | null;
  }) {
    this.removedSuggestionEvents.push({
      userId: input.userId,
      calendarEventRef: input.calendarEventRef,
      preferredCalendarId: input.preferredCalendarId ?? null,
    });
    return true;
  }

  async syncPublicEvents(userId: string) {
    this.syncPublicEventsCalls.push(userId);
    return this.syncPublicEventsResultByUser.get(userId) ?? {
      synced: 0,
      scanned: 0,
    };
  }
}

export class InMemoryContactsProvider implements ContactsProvider {
  snapshotsByUser = new Map<string, ContactsSnapshot | null>();
  addEmailCalls = [] as Array<{
    userId: string;
    email: string;
    contactGroupResourceName: string | null;
  }>;

  async getSnapshot(userId: string) {
    return this.snapshotsByUser.get(userId) ?? null;
  }

  async addEmailToGroup(input: {
    userId: string;
    email: string;
    contactGroupResourceName?: string | null;
  }) {
    this.addEmailCalls.push({
      userId: input.userId,
      email: input.email,
      contactGroupResourceName: input.contactGroupResourceName ?? null,
    });

    if (!input.email.trim()) {
      return { synced: false, reason: "Leere E-Mail" };
    }

    return { synced: true };
  }
}

export class InMemoryRepository
  implements MatcherRepository, ContactsSyncRepository
{
  visibleEventsByUser = new Map<string, VisibleEvent[]>();
  tagPreferencesByUser = new Map<
    string,
    Map<string, { weight: number; votes: number }>
  >();
  suggestionSettingsByUser = new Map<string, UserSuggestionSettings>();
  suggestions = new Map<string, MatcherSuggestionRecord>();
  groups = new Map<string, StoredGroup>();
  contactsByGroupId = new Map<
    string,
    Array<{
      email: string;
      name: string | null;
      image: string | null;
      sourceReference: string | null;
    }>
  >();
  matchedUserEmails = new Set<string>();
  matchedGroupMembersByGroupId = new Map<string, Set<string>>();

  setVisibleEvents(userId: string, events: VisibleEvent[]) {
    this.visibleEventsByUser.set(userId, events);
  }

  setTagPreferences(
    userId: string,
    preferences: Map<string, { weight: number; votes: number }>,
  ) {
    this.tagPreferencesByUser.set(userId, preferences);
  }

  setSuggestionSettings(
    userId: string,
    settings: Partial<UserSuggestionSettings>,
  ) {
    this.suggestionSettingsByUser.set(userId, {
      ...createDefaultSuggestionSettings(),
      ...settings,
    });
  }

  listSuggestionsForUser(userId: string) {
    return Array.from(this.suggestions.values()).filter(
      (suggestion) => suggestion.userId === userId,
    );
  }

  getGroupByResourceName(userId: string, resourceName: string) {
    return Array.from(this.groups.values()).find(
      (group) =>
        group.userId === userId && group.resourceName === resourceName,
    );
  }

  getGroupContacts(groupId: string) {
    return this.contactsByGroupId.get(groupId) ?? [];
  }

  getMatchedMembers(groupId: string) {
    return Array.from(this.matchedGroupMembersByGroupId.get(groupId) ?? []);
  }

  async listVisibleEventsForUser(userId: string) {
    return [...(this.visibleEventsByUser.get(userId) ?? [])];
  }

  async getTagPreferenceMap(userId: string) {
    return this.tagPreferencesByUser.get(userId) ?? new Map();
  }

  async listSuggestionStatesForUser(userId: string) {
    return this.listSuggestionsForUser(userId).map<MatcherSuggestionState>(
      (suggestion) => ({
        id: suggestion.id,
        eventId: suggestion.eventId,
        status: suggestion.status,
        calendarEventId: suggestion.calendarEventId,
      }),
    );
  }

  async getUserSuggestionSettings(userId: string) {
    return (
      this.suggestionSettingsByUser.get(userId) ??
      createDefaultSuggestionSettings()
    );
  }

  async removeSuggestionsForUserByEventIds(input: {
    userId: string;
    eventIds: string[];
  }) {
    const eventIds = new Set(input.eventIds);
    const staleIds = Array.from(this.suggestions.values())
      .filter(
        (suggestion) =>
          suggestion.userId === input.userId && eventIds.has(suggestion.eventId),
      )
      .map((suggestion) => suggestion.id);

    for (const suggestionId of staleIds) {
      this.suggestions.delete(suggestionId);
    }

    return staleIds.length;
  }

  async upsertSuggestion(input: {
    userId: string;
    eventId: string;
    score: number;
    reason: string;
    status?: SuggestionStatus;
  }) {
    const existing = this.listSuggestionsForUser(input.userId).find(
      (suggestion) => suggestion.eventId === input.eventId,
    );

    const record: MatcherSuggestionRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      userId: input.userId,
      eventId: input.eventId,
      status: input.status ?? existing?.status ?? "pending",
      calendarEventId: existing?.calendarEventId ?? null,
      score: input.score,
      reason: input.reason,
    };

    this.suggestions.set(record.id, record);
    return record;
  }

  async markSuggestionInserted(
    suggestionId: string,
    calendarEventId: string,
  ) {
    const suggestion = this.suggestions.get(suggestionId);
    if (suggestion) {
      suggestion.status = "calendar_inserted";
      suggestion.calendarEventId = calendarEventId;
    }
  }

  async ensureKontakteGroupForUser(userId: string) {
    const existing = this.getGroupByResourceName(
      userId,
      "contactGroups/myContacts",
    );
    if (existing) {
      return { id: existing.id };
    }

    const group: StoredGroup = {
      id: crypto.randomUUID(),
      userId,
      name: "#kontakte",
      resourceName: "contactGroups/myContacts",
      hashtags: ["#kontakte"],
    };
    this.groups.set(group.id, group);
    return { id: group.id };
  }

  async upsertGoogleContactsLabelGroup(input: {
    userId: string;
    labelName: string;
    labelResourceName: string;
    hashtags: string[];
  }) {
    const existing = this.getGroupByResourceName(
      input.userId,
      input.labelResourceName,
    );

    const group: StoredGroup = existing ?? {
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.labelName,
      resourceName: input.labelResourceName,
      hashtags: [...input.hashtags],
    };

    group.name = input.labelName;
    group.hashtags = [...input.hashtags];
    this.groups.set(group.id, group);
    return { id: group.id };
  }

  async replaceGoogleSyncedGroupContacts(input: {
    groupId: string;
    contacts: Array<{
      email: string;
      name?: string | null;
      image?: string | null;
      sourceReference?: string | null;
    }>;
  }) {
    const normalized = Array.from(
      new Map(
        input.contacts
          .map((contact) => ({
            email: contact.email.trim().toLowerCase(),
            name: contact.name?.trim() || null,
            image: contact.image?.trim() || null,
            sourceReference: contact.sourceReference ?? null,
          }))
          .filter((contact) => Boolean(contact.email))
          .map((contact) => [contact.email, contact]),
      ).values(),
    );

    this.contactsByGroupId.set(input.groupId, normalized);
    return { syncedContacts: normalized.length };
  }

  async addKnownUsersToGroupByEmails(input: {
    groupId: string;
    emails: string[];
  }) {
    const matched = Array.from(
      new Set(input.emails.map((email) => email.trim().toLowerCase())),
    ).filter((email) => this.matchedUserEmails.has(email));

    const groupMembers =
      this.matchedGroupMembersByGroupId.get(input.groupId) ?? new Set<string>();
    for (const email of matched) {
      groupMembers.add(email);
    }
    this.matchedGroupMembersByGroupId.set(input.groupId, groupMembers);

    return { matchedUsers: matched.length };
  }
}
