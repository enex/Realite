import { describe, expect, test } from "bun:test";

import { createContactsSyncService } from "@/src/lib/google-contacts";
import { InMemoryContactsProvider, InMemoryRepository } from "@/src/lib/in-memory-platform";

describe("contacts sync service", () => {
  test("returns zero stats when no contacts provider is connected", async () => {
    const provider = new InMemoryContactsProvider();
    const repository = new InMemoryRepository();
    const service = createContactsSyncService({ provider, repository });

    const stats = await service.syncContactsToGroups("user-1");

    expect(stats).toEqual({
      syncedGroups: 0,
      syncedMembers: 0,
      scannedContacts: 0,
    });
  });

  test("syncs my contacts and label groups through the injected repository", async () => {
    const provider = new InMemoryContactsProvider();
    const repository = new InMemoryRepository();
    repository.matchedUserEmails.add("alice@example.com");
    repository.matchedUserEmails.add("bob@example.com");

    provider.snapshotsByUser.set("user-1", {
      groups: [
        {
          resourceName: "contactGroups/myContacts",
          name: "Meine Kontakte",
          groupType: "SYSTEM_CONTACT_GROUP",
        },
        {
          resourceName: "contactGroups/friends",
          name: "Friends",
          groupType: "USER_CONTACT_GROUP",
        },
        {
          resourceName: "contactGroups/system",
          name: "System",
          groupType: "SYSTEM_CONTACT_GROUP",
        },
      ],
      contacts: [
        {
          resourceName: "people/alice",
          displayName: "Alice",
          emails: ["alice@example.com", "Alice@example.com"],
          photoUrl: "https://example.com/alice.jpg",
          groupResourceNames: ["contactGroups/friends"],
        },
        {
          resourceName: "people/bob",
          displayName: "Bob",
          emails: ["bob@example.com"],
          photoUrl: null,
          groupResourceNames: [],
        },
      ],
    });

    const service = createContactsSyncService({ provider, repository });
    const stats = await service.syncContactsToGroups("user-1");

    const kontakteGroup = repository.getGroupByResourceName(
      "user-1",
      "contactGroups/myContacts",
    );
    const friendsGroup = repository.getGroupByResourceName(
      "user-1",
      "contactGroups/friends",
    );

    expect(stats).toEqual({
      syncedGroups: 2,
      syncedMembers: 3,
      scannedContacts: 2,
    });
    expect(
      repository.getGroupContacts(kontakteGroup?.id ?? "").map((entry) => entry.email),
    ).toEqual(["alice@example.com", "bob@example.com"]);
    expect(
      repository.getGroupContacts(friendsGroup?.id ?? "").map((entry) => entry.email),
    ).toEqual(["alice@example.com"]);
    expect(repository.getMatchedMembers(kontakteGroup?.id ?? "")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    expect(repository.getMatchedMembers(friendsGroup?.id ?? "")).toEqual([
      "alice@example.com",
    ]);
  });
});
