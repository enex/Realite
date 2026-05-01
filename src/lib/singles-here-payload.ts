import type { SinglesHerePresence } from "@/src/lib/repository";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";

export type SinglesHereClientPayload = {
  event: {
    id: string;
    slug: string;
    name: string;
    location: string | null;
    startsAt: string;
    endsAt: string;
    createdBy: string;
  };
  profile: SinglesHerePresence["profile"];
  profileUnlocked: boolean;
  age: number | null;
  currentUserStatus: SinglesHerePresence["currentUserStatus"];
  currentUserVisibleUntilIso: string | null;
  /** Freitext-Treffpunkt am Event; nur sichtbar für passende eingecheckte Personen. */
  currentUserPresenceLocationNote: string | null;
  checkedInCount: number;
  matchingPeople: Array<{
    userId: string;
    name: string | null;
    image: string | null;
    visibleUntilIso: string;
    presenceLocationNote: string | null;
  }>;
  viewerProfileImageStorageUrl: string | null;
  viewerProfileImageDisplayUrl: string | null;
};

export async function buildSinglesHereClientPayload(
  presence: SinglesHerePresence,
  viewerProfileImageStorageUrl: string | null,
): Promise<SinglesHereClientPayload> {
  const viewerProfileImageDisplayUrl =
    await resolveProfileImageReadUrl(viewerProfileImageStorageUrl);

  return {
    event: {
      id: presence.event.id,
      slug: presence.event.slug,
      name: presence.event.name,
      location: presence.event.location,
      startsAt: presence.event.startsAt.toISOString(),
      endsAt: presence.event.endsAt.toISOString(),
      createdBy: presence.event.createdBy,
    },
    profile: presence.profile,
    profileUnlocked: presence.profileUnlocked,
    age: presence.age,
    currentUserStatus: presence.currentUserStatus,
    currentUserVisibleUntilIso:
      presence.currentUserVisibleUntil?.toISOString() ?? null,
    currentUserPresenceLocationNote: presence.currentUserPresenceLocationNote,
    checkedInCount: presence.checkedInCount,
    matchingPeople: presence.matchingPeople.map((person) => ({
      userId: person.userId,
      name: person.name,
      image: person.image,
      visibleUntilIso: person.visibleUntil.toISOString(),
      presenceLocationNote: person.presenceLocationNote,
    })),
    viewerProfileImageStorageUrl,
    viewerProfileImageDisplayUrl,
  };
}
