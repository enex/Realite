import {
  addKnownUsersToGroupByEmails,
  ensureKontakteGroupForUser,
  replaceGoogleSyncedGroupContacts,
  upsertGoogleContactsLabelGroup
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
  memberships?: Array<{
    contactGroupMembership?: {
      contactGroupResourceName?: string;
    };
  }>;
};

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
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const details = await readGoogleError(response);
    if (response.status === 403) {
      throw new Error(
        `Google Kontaktezugriff verweigert (403)${
          details ? `: ${details}` : ""
        }. Bitte einmal abmelden und erneut mit Google anmelden.`
      );
    }

    throw new Error(`Google Kontakte Sync fehlgeschlagen (${response.status})${details ? `: ${details}` : ""}`);
  }

  return response;
}

export async function syncGoogleContactsToGroups(userId: string) {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return { syncedGroups: 0, syncedMembers: 0, scannedContacts: 0 };
  }

  const kontakteGroup = await ensureKontakteGroupForUser(userId);
  const groupIdByContactGroupResource = new Map<string, string>();
  groupIdByContactGroupResource.set("contactGroups/myContacts", kontakteGroup.id);

  let syncedGroups = 1;
  let syncedMembers = 0;
  let scannedContacts = 0;
  let groupPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "200",
      groupFields: "name,groupType"
    });

    if (groupPageToken) {
      params.set("pageToken", groupPageToken);
    }

    const response = await fetchGoogleOrThrow(
      `https://people.googleapis.com/v1/contactGroups?${params.toString()}`,
      token
    );
    const payload = (await response.json()) as {
      contactGroups?: GoogleContactGroup[];
      nextPageToken?: string;
    };

    for (const group of payload.contactGroups ?? []) {
      if (!group.resourceName || !group.name) {
        continue;
      }

      if (group.resourceName === "contactGroups/myContacts") {
        groupIdByContactGroupResource.set(group.resourceName, kontakteGroup.id);
        continue;
      }

      if (group.groupType && group.groupType !== "USER_CONTACT_GROUP") {
        continue;
      }

      const syncedGroup = await upsertGoogleContactsLabelGroup({
        userId,
        labelName: group.name,
        labelResourceName: group.resourceName,
        hashtags: [groupNameToHashtag(group.name)]
      });
      groupIdByContactGroupResource.set(group.resourceName, syncedGroup.id);
      syncedGroups += 1;
    }

    groupPageToken = payload.nextPageToken;
  } while (groupPageToken);

  const contactsByLocalGroupId = new Map<
    string,
    Map<string, { email: string; name: string | null; sourceReference: string | null }>
  >();
  let contactsPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "1000",
      personFields: "names,emailAddresses,memberships"
    });

    if (contactsPageToken) {
      params.set("pageToken", contactsPageToken);
    }

    const response = await fetchGoogleOrThrow(
      `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
      token
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
            .filter(Boolean)
        )
      );

      if (!emails.length) {
        continue;
      }

      scannedContacts += 1;
      const displayName = person.names?.[0]?.displayName?.trim() || null;
      const sourceReference = person.resourceName ?? null;

      const addContactsToGroup = (groupId: string) => {
        const contacts = contactsByLocalGroupId.get(groupId) ?? new Map();
        for (const email of emails) {
          contacts.set(email, {
            email,
            name: displayName,
            sourceReference
          });
        }
        contactsByLocalGroupId.set(groupId, contacts);
      };

      addContactsToGroup(kontakteGroup.id);

      for (const membership of person.memberships ?? []) {
        const ref = membership.contactGroupMembership?.contactGroupResourceName;
        if (!ref) {
          continue;
        }

        const localGroupId = groupIdByContactGroupResource.get(ref);
        if (!localGroupId) {
          continue;
        }

        addContactsToGroup(localGroupId);
      }
    }

    contactsPageToken = payload.nextPageToken;
  } while (contactsPageToken);

  const syncedGroupIds = Array.from(new Set(groupIdByContactGroupResource.values()));

  for (const groupId of syncedGroupIds) {
    const contacts = Array.from(contactsByLocalGroupId.get(groupId)?.values() ?? []);
    await replaceGoogleSyncedGroupContacts({
      groupId,
      contacts
    });

    const emails = contacts.map((contact) => contact.email);
    const result = await addKnownUsersToGroupByEmails({
      groupId,
      emails
    });
    syncedMembers += result.matchedUsers;
  }

  return { syncedGroups, syncedMembers, scannedContacts };
}

async function findGooglePersonByEmail(token: string, email: string) {
  const params = new URLSearchParams({
    query: email,
    pageSize: "10",
    readMask: "emailAddresses"
  });

  const response = await fetchGoogleOrThrow(
    `https://people.googleapis.com/v1/people:searchContacts?${params.toString()}`,
    token
  );
  const payload = (await response.json()) as {
    results?: Array<{
      person?: GooglePerson;
    }>;
  };

  for (const result of payload.results ?? []) {
    const person = result.person;
    const hasExactEmail = (person?.emailAddresses ?? []).some(
      (entry) => normalizeEmail(entry.value ?? "") === email
    );
    if (person?.resourceName && hasExactEmail) {
      return person.resourceName;
    }
  }

  return null;
}

async function createGoogleContact(token: string, email: string) {
  const response = await fetchGoogleOrThrow("https://people.googleapis.com/v1/people:createContact", token, {
    method: "POST",
    body: JSON.stringify({
      emailAddresses: [{ value: email }]
    })
  });

  const payload = (await response.json()) as { resourceName?: string };
  return payload.resourceName ?? null;
}

export async function addEmailToGoogleContactsGroup(input: {
  userId: string;
  email: string;
  contactGroupResourceName?: string | null;
}) {
  const token = await getGoogleAccessToken(input.userId);
  if (!token) {
    return { synced: false, reason: "Kein Google-Token verfügbar" as const };
  }

  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    return { synced: false, reason: "Leere E-Mail" as const };
  }

  let personResourceName = await findGooglePersonByEmail(token, normalizedEmail);
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
          resourceNamesToAdd: [personResourceName]
        })
      }
    );
  }

  return { synced: true as const };
}
