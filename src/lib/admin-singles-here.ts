import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { datingProfiles, eventPresences, events, users } from "@/src/db/schema";
import type { DatingGender } from "@/src/lib/dating";
import {
  getDatingProfileStatus,
  getAgeFromBirthYear,
  isDatingMutualMatch,
} from "@/src/lib/dating";
import { getEventPresenceWindow } from "@/src/lib/event-presence";
import type { EventPresenceStatus } from "@/src/lib/event-presence";
import { getDatingProfileMapForUsers } from "@/src/lib/repository";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import {
  normalizeSinglesHereSlug,
  SINGLES_HERE_SOURCE_PROVIDER,
} from "@/src/lib/singles-here";

export type SinglesHereAdminParticipant = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  presenceStatus: EventPresenceStatus;
  visibleUntilIso: string;
  unlockedProfile: boolean;
  gender: DatingGender | null;
  age: number | null;
};

function activeCheckedInUserIds(input: {
  rows: Array<{
    userId: string;
    status: EventPresenceStatus;
    visibleUntil: Date;
  }>;
  startsAt: Date;
  endsAt: Date;
  now: Date;
}): string[] {
  const window = getEventPresenceWindow({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    now: input.now,
  });
  if (!window.showsPresence) {
    return [];
  }

  return input.rows
    .filter(
      (row) =>
        row.status === "checked_in" &&
        row.visibleUntil.getTime() > input.now.getTime(),
    )
    .map((row) => row.userId);
}

async function countMutualMatchPairsAsync(
  userIds: string[],
  now: Date,
): Promise<number> {
  if (userIds.length < 2) {
    return 0;
  }

  const profiles = await getDatingProfileMapForUsers(userIds);
  let pairs = 0;
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const a = profiles.get(userIds[i]);
      const b = profiles.get(userIds[j]);
      if (!a || !b) {
        continue;
      }
      if (isDatingMutualMatch(a, b, now)) {
        pairs++;
      }
    }
  }
  return pairs;
}

export async function listSinglesHereEventsForAdmin(input: {
  now: Date;
  maxRows: number;
}) {
  const db = getDb();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.sourceEventId,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      createdBy: events.createdBy,
    })
    .from(events)
    .where(eq(events.sourceProvider, SINGLES_HERE_SOURCE_PROVIDER))
    .orderBy(desc(events.endsAt))
    .limit(input.maxRows);

  if (!rows.length) {
    return [];
  }

  const eventIds = rows.map((r) => r.id);
  const presenceRows = await db
    .select({
      eventId: eventPresences.eventId,
      userId: eventPresences.userId,
      status: eventPresences.status,
      visibleUntil: eventPresences.visibleUntil,
    })
    .from(eventPresences)
    .where(inArray(eventPresences.eventId, eventIds));

  const byEvent = new Map<string, typeof presenceRows>();
  for (const pr of presenceRows) {
    const list = byEvent.get(pr.eventId) ?? [];
    list.push(pr);
    byEvent.set(pr.eventId, list);
  }

  const now = input.now;

  return rows.map((ev) => {
    const slug = ev.slug ?? "";
    const pres = byEvent.get(ev.id) ?? [];
    const activeIds = activeCheckedInUserIds({
      rows: pres,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      now,
    });
    const window = getEventPresenceWindow({
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      now,
    });
    const displayName = ev.title.replace(/#[^\s]+/gi, "").trim();
    return {
      id: ev.id,
      slug,
      name: displayName,
      location: ev.location,
      startsAtIso: ev.startsAt.toISOString(),
      endsAtIso: ev.endsAt.toISOString(),
      createdBy: ev.createdBy,
      presenceWindowState: window.state,
      activeCheckedInCount: activeIds.length,
      activeCheckedInUserIds: activeIds,
      totalPresenceRows: pres.length,
    };
  });
}

export async function getSinglesHereAdminOverview(input: { now: Date }) {
  const now = input.now;
  const eventSummaries = await listSinglesHereEventsForAdmin({
    now,
    maxRows: 80,
  });

  const activeByEvent = eventSummaries.filter(
    (e) => e.activeCheckedInCount > 0,
  );
  const uniqueUserIds = new Set<string>();
  for (const e of activeByEvent) {
    for (const id of e.activeCheckedInUserIds) {
      uniqueUserIds.add(id);
    }
  }

  const genderCount: Record<string, number> = {
    woman: 0,
    man: 0,
    non_binary: 0,
    unknown: 0,
  };

  if (uniqueUserIds.size) {
    const profileMap = await getDatingProfileMapForUsers([...uniqueUserIds]);
    for (const userId of uniqueUserIds) {
      const p = profileMap.get(userId);
      const st = p ? getDatingProfileStatus(p, now) : null;
      if (!st?.unlocked || !p?.gender) {
        genderCount.unknown++;
        continue;
      }
      const g = p.gender;
      genderCount[g] = (genderCount[g] ?? 0) + 1;
    }
  }

  let mutualPairsTotal = 0;
  for (const e of activeByEvent) {
    mutualPairsTotal += await countMutualMatchPairsAsync(
      e.activeCheckedInUserIds,
      now,
    );
  }

  const topEvents = [...eventSummaries]
    .filter(
      (e) => e.presenceWindowState !== "ended" || e.activeCheckedInCount > 0,
    )
    .sort((a, b) => b.activeCheckedInCount - a.activeCheckedInCount)
    .slice(0, 12);

  const topEventsPublic = topEvents.map(
    ({ activeCheckedInUserIds: _omit, ...rest }) => rest,
  );

  return {
    generatedAtIso: now.toISOString(),
    singlesHereEventCount: eventSummaries.length,
    eventsWithActivePresence: activeByEvent.length,
    distinctUsersCheckedIn: uniqueUserIds.size,
    genderAmongActiveCheckedIn: genderCount,
    mutualMatchPairCountAmongActive: mutualPairsTotal,
    topEventsByActiveCheckIn: topEventsPublic,
  };
}

export async function getSinglesHereEventAdminDetail(input: {
  slug: string;
  now: Date;
}) {
  const normalized = normalizeSinglesHereSlug(input.slug);
  const db = getDb();
  const [ev] = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.sourceEventId,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      createdBy: events.createdBy,
    })
    .from(events)
    .where(
      and(
        eq(events.sourceProvider, SINGLES_HERE_SOURCE_PROVIDER),
        eq(events.sourceEventId, normalized),
      ),
    )
    .limit(1);

  if (!ev || !ev.slug) {
    return null;
  }

  const presRows = await db
    .select({
      userId: eventPresences.userId,
      status: eventPresences.status,
      visibleUntil: eventPresences.visibleUntil,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(eventPresences)
    .innerJoin(users, eq(eventPresences.userId, users.id))
    .where(eq(eventPresences.eventId, ev.id))
    .orderBy(desc(eventPresences.updatedAt));

  const now = input.now;
  const window = getEventPresenceWindow({
    startsAt: ev.startsAt,
    endsAt: ev.endsAt,
    now,
  });

  const activeIds = activeCheckedInUserIds({
    rows: presRows,
    startsAt: ev.startsAt,
    endsAt: ev.endsAt,
    now,
  });
  const profileMap = await getDatingProfileMapForUsers(
    presRows.map((r) => r.userId),
  );

  const participants: SinglesHereAdminParticipant[] = await Promise.all(
    presRows.map(async (row) => {
      const prof = profileMap.get(row.userId);
      const st = prof ? getDatingProfileStatus(prof, now) : null;
      const age =
        prof?.birthYear != null
          ? getAgeFromBirthYear(prof.birthYear, now)
          : null;
      const image = await resolveProfileImageReadUrl(row.image).catch(
        () => row.image ?? null,
      );
      return {
        userId: row.userId,
        name: row.name,
        email: row.email,
        image,
        presenceStatus: row.status,
        visibleUntilIso: row.visibleUntil.toISOString(),
        unlockedProfile: st?.unlocked ?? false,
        gender: prof?.gender ?? null,
        age,
      };
    }),
  );

  const mutualPairs = await countMutualMatchPairsAsync(activeIds, now);

  const genderActive: Record<string, number> = {
    woman: 0,
    man: 0,
    non_binary: 0,
    unknown: 0,
  };
  for (const uid of activeIds) {
    const p = profileMap.get(uid);
    const st = p ? getDatingProfileStatus(p, now) : null;
    if (!st?.unlocked || !p?.gender) {
      genderActive.unknown++;
    } else {
      genderActive[p.gender] = (genderActive[p.gender] ?? 0) + 1;
    }
  }

  return {
    event: {
      id: ev.id,
      slug: ev.slug,
      name: ev.title.replace(/#[^\s]+/gi, "").trim(),
      location: ev.location,
      startsAtIso: ev.startsAt.toISOString(),
      endsAtIso: ev.endsAt.toISOString(),
      createdBy: ev.createdBy,
      presenceWindowState: window.state,
      publicPath: `/singles/${encodeURIComponent(ev.slug)}`,
    },
    activeCheckedInCount: activeIds.length,
    mutualMatchPairCount: mutualPairs,
    genderAmongActiveCheckedIn: genderActive,
    participants,
  };
}

export async function adminForceLeaveSinglesHerePresence(input: {
  slug: string;
  targetUserId: string;
  now: Date;
}) {
  const detail = await getSinglesHereEventAdminDetail({
    slug: input.slug,
    now: input.now,
  });
  if (!detail) {
    return { ok: false as const, error: "Event nicht gefunden." };
  }

  const db = getDb();
  const now = input.now;
  await db
    .insert(eventPresences)
    .values({
      eventId: detail.event.id,
      userId: input.targetUserId,
      status: "left",
      visibleUntil: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [eventPresences.eventId, eventPresences.userId],
      set: {
        status: "left",
        visibleUntil: now,
        updatedAt: now,
      },
    });

  return { ok: true as const };
}

/** Disables dating mode for a user (moderation). */
export async function adminDisableDatingProfile(userId: string) {
  const db = getDb();
  await db
    .update(datingProfiles)
    .set({
      enabled: false,
      updatedAt: new Date(),
    })
    .where(eq(datingProfiles.userId, userId));
}
