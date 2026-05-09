import { isDatingMutualMatch } from "@/src/lib/dating";
import {
  getDatingProfileMapForUsers,
  getEventPresenceSummary,
  getUserById,
  getUserDatingProfile,
  getVisibleEventForUserById,
} from "@/src/lib/repository";
import { SINGLES_HERE_SOURCE_PROVIDER } from "@/src/lib/singles-here";
import { sendWebPushToUsers } from "@/src/lib/web-push";

export async function notifySinglesHereMatchesForCheckIn(input: {
  eventId: string;
  checkedInUserId: string;
}) {
  const event = await getVisibleEventForUserById({
    userId: input.checkedInUserId,
    eventId: input.eventId,
  });

  if (
    !event ||
    event.sourceProvider !== SINGLES_HERE_SOURCE_PROVIDER ||
    !event.sourceEventId
  ) {
    return;
  }

  const summary = await getEventPresenceSummary({
    userId: input.checkedInUserId,
    eventId: input.eventId,
  });
  const candidateUserIds = summary.checkedInUsers
    .map((entry) => entry.userId)
    .filter((userId) => userId !== input.checkedInUserId);
  if (!candidateUserIds.length) {
    return;
  }

  const [checkedInProfile, profileMap, checkedInUser] = await Promise.all([
    getUserDatingProfile(input.checkedInUserId),
    getDatingProfileMapForUsers(candidateUserIds),
    getUserById(input.checkedInUserId),
  ]);

  const matchingUserIds = candidateUserIds.filter((userId) => {
    const profile = profileMap.get(userId);
    return profile
      ? isDatingMutualMatch(profile, checkedInProfile, new Date())
      : false;
  });

  if (!matchingUserIds.length) {
    return;
  }

  const name = checkedInUser?.name?.trim() || "Jemand Passendes";
  await sendWebPushToUsers({
    userIds: matchingUserIds,
    payload: {
      title: "Neues Match vor Ort",
      body: `${name} ist jetzt bei ${event.title.replace(/#[^\s]+/gi, "").trim() || "deinem Event"} sichtbar.`,
      url: `/singles/${encodeURIComponent(event.sourceEventId)}`,
      tag: `singles-here-${event.id}`,
    },
  });
}
