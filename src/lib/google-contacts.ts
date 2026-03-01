import {
  addKnownUsersToGroupByEmails,
  ensureKontakteGroupForUser,
  replaceGoogleSyncedGroupContacts,
  upsertGoogleContactsLabelGroup,
} from "@/src/lib/repository";
import { getGoogleAccessToken } from "@/src/lib/google-calendar";

type GoogleContactGroup = {
  resourceName?: string;
  name?: string;
  groupType?: string;
};

type GooglePerson = {
  resourceName?: string;
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  photos?: Array<{ url?: string; default?: boolean }>;
  memberships?: Array<{
    contactGroupMembership?: {
      contactGroupResourceName?: string;
    };
  }>;
};

export type ContactsSnapshot = {
  groups: ContactsGroup[];
  contacts: ContactsPerson[];
};

export type ContactsGroup = {
  resourceName: string;
  name: string;
  groupType: string | null;
};

export type ContactsPerson = {
  resourceName: string | null;
  displayName: string | null;
  emails: string[];
  photoUrl: string | null;
  groupResourceNames: string[];
};

export type ContactsSyncStats = {
  syncedGroups: number;
  syncedMembers: number;
  scannedContacts: number;
};

export interface ContactsProvider {
  getSnapshot(userId: string): Promise<ContactsSnapshot | null>;
  addEmailToGroup(input: {
    userId: string;
    email: string;
    contactGroupResourceName?: string | null;
  }): Promise<{ synced: boolean; reason?: string }>;
}

export interface ContactsSyncRepository {
  ensureKontakteGroupForUser(userId: string): Promise<{ id: string }>;
  upsertGoogleContactsLabelGroup(input: {
    userId: string;
    labelName: string;
    labelResourceName: string;
    hashtags: string[];
  }): Promise<{ id: string }>;
  replaceGoogleSyncedGroupContacts(input: {
    groupId: string;
    contacts: Array<{
      email: string;
      name?: string | null;
      image?: string | null;
      sourceReference?: string | null;
    }>;
  }): Promise<unknown>;
  addKnownUsersToGroupByEmails(input: {
    groupId: string;
    emails: string[];
  }): Promise<{ matchedUsers: number }>;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function groupNameToHashtag(name: string) {
  const value = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return value ? `#${value}` : "#kontakte";
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

async function fetchGoogleOrThrow(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await readGoogleError(response);
    if (response.status === 403) {
      throw new Error(
        `Google Kontaktezugriff verweigert (403)${
          details ? `: ${details}` : ""
        }. Bitte einmal abmelden und erneut mit Google anmelden.`,
      );
    }

    throw new Error(
      `Google Kontakte Sync fehlgeschlagen (${response.status})${
        details ? `: ${details}` : ""
      }`,
    );
  }

  return response;
}

async function listGoogleContactGroups(token: string) {
  const groups = [] as ContactsGroup[];
  let groupPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "200",
      groupFields: "name,groupType",
    });

    if (groupPageToken) {
      params.set("pageToken", groupPageToken);
    }

    const response = await fetchGoogleOrThrow(
      `https://people.googleapis.com/v1/contactGroups?${params.toString()}`,
      token,
    );
    const payload = (await response.json()) as {
      contactGroups?: GoogleContactGroup[];
      nextPageToken?: string;
    };

    for (const group of payload.contactGroups ?? []) {
      if (!group.resourceName || !group.name) {
        continue;
      }

      groups.push({
        resourceName: group.resourceName,
        name: group.name,
        groupType: group.groupType ?? null,
      });
    }

    groupPageToken = payload.nextPageToken;
  } while (groupPageToken);

  return groups;
}

async function listGoogleContacts(token: string) {
  const contacts = [] as ContactsPerson[];
  let contactsPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "1000",
      personFields: "names,emailAddresses,photos,memberships",
    });

    if (contactsPageToken) {
      params.set("pageToken", contactsPageToken);
    }

    const response = await fetchGoogleOrThrow(
      `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
      token,
    );
    const payload = (await response.json()) as {
      connections?: GooglePerson[];
      nextPageToken?: string;
    };

    for (const person of payload.connections ?? []) {
      const emails = Array.from(
        new Set(
          (person.emailAddresses ?? [])
            .map((entry) => entry.value ?? "")
            .map((email) => normalizeEmail(email))
            .filter(Boolean),
        ),
      );

      if (!emails.length) {
        continue;
      }

      contacts.push({
        resourceName: person.resourceName ?? null,
        displayName: person.names?.[0]?.displayName?.trim() || null,
        emails,
        photoUrl:
          person.photos
            ?.find((entry) => Boolean(entry.url) && !entry.default)
            ?.url?.trim() ??
          person.photos?.find((entry) => Boolean(entry.url))?.url?.trim() ??
          null,
        groupResourceNames: Array.from(
          new Set(
            (person.memberships ?? [])
              .map(
                (membership) =>
                  membership.contactGroupMembership?.contactGroupResourceName ??
                  "",
              )
              .filter(Boolean),
          ),
        ),
      });
    }

    contactsPageToken = payload.nextPageToken;
  } while (contactsPageToken);

  return contacts;
}

async function findGooglePersonByEmail(token: string, email: string) {
  const params = new URLSearchParams({
    query: email,
    pageSize: "10",
    readMask: "emailAddresses",
  });

  const response = await fetchGoogleOrThrow(
    `https://people.googleapis.com/v1/people:searchContacts?${params.toString()}`,
    token,
  );
  const payload = (await response.json()) as {
    results?: Array<{
      person?: GooglePerson;
    }>;
  };

  for (const result of payload.results ?? []) {
    const person = result.person;
    const hasExactEmail = (person?.emailAddresses ?? []).some(
      (entry) => normalizeEmail(entry.value ?? "") === email,
    );
    if (person?.resourceName && hasExactEmail) {
      return person.resourceName;
    }
  }

  return null;
}

async function createGoogleContact(token: string, email: string) {
  const response = await fetchGoogleOrThrow(
    "https://people.googleapis.com/v1/people:createContact",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        emailAddresses: [{ value: email }],
      }),
    },
  );

  const payload = (await response.json()) as { resourceName?: string };
  return payload.resourceName ?? null;
}

export const googleContactsProvider: ContactsProvider = {
  async getSnapshot(userId) {
    const token = await getGoogleAccessToken(userId);
    if (!token) {
      return null;
    }

    const [groups, contacts] = await Promise.all([
      listGoogleContactGroups(token),
      listGoogleContacts(token),
    ]);

    return { groups, contacts };
  },
  async addEmailToGroup(input) {
    const token = await getGoogleAccessToken(input.userId);
    if (!token) {
      return { synced: false, reason: "Kein Google-Token verfügbar" };
    }

    const normalizedEmail = normalizeEmail(input.email);
    if (!normalizedEmail) {
      return { synced: false, reason: "Leere E-Mail" };
    }

    let personResourceName = await findGooglePersonByEmail(
      token,
      normalizedEmail,
    );
    if (!personResourceName) {
      personResourceName = await createGoogleContact(token, normalizedEmail);
    }

    if (!personResourceName) {
      throw new Error("Google Kontakt konnte nicht erstellt oder gefunden werden.");
    }

    const groupRef = input.contactGroupResourceName ?? null;
    if (groupRef && groupRef !== "contactGroups/myContacts") {
      await fetchGoogleOrThrow(
        `https://people.googleapis.com/v1/${groupRef}/members:modify`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            resourceNamesToAdd: [personResourceName],
          }),
        },
      );
    }

    return { synced: true };
  },
};

const defaultContactsSyncRepository: ContactsSyncRepository = {
  ensureKontakteGroupForUser,
  upsertGoogleContactsLabelGroup,
  replaceGoogleSyncedGroupContacts,
  addKnownUsersToGroupByEmails,
};

export function createContactsSyncService(input: {
  provider: ContactsProvider;
  repository: ContactsSyncRepository;
}) {
  async function syncContactsToGroups(userId: string): Promise<ContactsSyncStats> {
    const snapshot = await input.provider.getSnapshot(userId);
    if (!snapshot) {
      return { syncedGroups: 0, syncedMembers: 0, scannedContacts: 0 };
    }

    const kontakteGroup =
      await input.repository.ensureKontakteGroupForUser(userId);
    const groupIdByContactGroupResource = new Map<string, string>();
    groupIdByContactGroupResource.set("contactGroups/myContacts", kontakteGroup.id);

    let syncedGroups = 1;
    let syncedMembers = 0;
    let scannedContacts = 0;

    for (const group of snapshot.groups) {
      if (group.resourceName === "contactGroups/myContacts") {
        groupIdByContactGroupResource.set(group.resourceName, kontakteGroup.id);
        continue;
      }

      if (group.groupType && group.groupType !== "USER_CONTACT_GROUP") {
        continue;
      }

      const syncedGroup = await input.repository.upsertGoogleContactsLabelGroup({
        userId,
        labelName: group.name,
        labelResourceName: group.resourceName,
        hashtags: [groupNameToHashtag(group.name)],
      });
      groupIdByContactGroupResource.set(group.resourceName, syncedGroup.id);
      syncedGroups += 1;
    }

    const contactsByLocalGroupId = new Map<
      string,
      Map<
        string,
        {
          email: string;
          name: string | null;
          image: string | null;
          sourceReference: string | null;
        }
      >
    >();

    for (const person of snapshot.contacts) {
      if (!person.emails.length) {
        continue;
      }

      scannedContacts += 1;

      const addContactsToGroup = (groupId: string) => {
        const contacts = contactsByLocalGroupId.get(groupId) ?? new Map();
        for (const email of person.emails) {
          contacts.set(email, {
            email,
            name: person.displayName,
            image: person.photoUrl,
            sourceReference: person.resourceName,
          });
        }
        contactsByLocalGroupId.set(groupId, contacts);
      };

      addContactsToGroup(kontakteGroup.id);

      for (const ref of person.groupResourceNames) {
        const localGroupId = groupIdByContactGroupResource.get(ref);
        if (!localGroupId) {
          continue;
        }

        addContactsToGroup(localGroupId);
      }
    }

    const syncedGroupIds = Array.from(
      new Set(groupIdByContactGroupResource.values()),
    );

    for (const groupId of syncedGroupIds) {
      const contacts = Array.from(
        contactsByLocalGroupId.get(groupId)?.values() ?? [],
      );
      await input.repository.replaceGoogleSyncedGroupContacts({
        groupId,
        contacts,
      });

      const result = await input.repository.addKnownUsersToGroupByEmails({
        groupId,
        emails: contacts.map((contact) => contact.email),
      });
      syncedMembers += result.matchedUsers;
    }

    return { syncedGroups, syncedMembers, scannedContacts };
  }

  return {
    syncContactsToGroups,
  };
}

const defaultContactsSyncService = createContactsSyncService({
  provider: googleContactsProvider,
  repository: defaultContactsSyncRepository,
});

export async function syncGoogleContactsToGroups(userId: string) {
  return defaultContactsSyncService.syncContactsToGroups(userId);
}

export async function addEmailToGoogleContactsGroup(input: {
  userId: string;
  email: string;
  contactGroupResourceName?: string | null;
}) {
  return googleContactsProvider.addEmailToGroup(input);
}
