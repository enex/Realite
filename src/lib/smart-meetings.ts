import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  groupContacts,
  groupMemberships,
  groups,
  smartMeetingMemberStats,
  smartMeetingPlans,
  smartMeetingRuns,
  tagPreferences,
  users
} from "@/src/db/schema";
import {
  type CalendarAttendeeResponse,
  getCalendarAttendeeResponses,
  getBusyWindows,
  insertGroupMeetingIntoCalendar,
  removeSuggestionCalendarEvent
} from "@/src/lib/google-calendar";
import {
  createEvent,
  deleteEventsByIds,
  getUserSuggestionSettings,
  isGroupMember,
  type EventVisibility
} from "@/src/lib/repository";
import { createPersonPreferenceTag, createTimeslotPreferenceTag } from "@/src/lib/suggestion-feedback";

const DEFAULT_SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_RESPONSE_WINDOW_HOURS = 24;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_CANDIDATE_SLOTS = 600;

export class SmartMeetingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmartMeetingValidationError";
  }
}

export type CreateSmartMeetingInput = {
  userId: string;
  groupId: string;
  title: string;
  description?: string;
  location?: string;
  tags?: string[];
  durationMinutes: number;
  minAcceptedParticipants: number;
  responseWindowHours?: number;
  searchWindowStart: Date;
  searchWindowEnd: Date;
  slotIntervalMinutes?: number;
  maxAttempts?: number;
};

export type SmartMeetingSummary = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  status: "active" | "secured" | "exhausted" | "paused";
  tags: string[];
  minAcceptedParticipants: number;
  responseWindowHours: number;
  maxAttempts: number;
  searchWindowStart: Date;
  searchWindowEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  latestRun: {
    id: string;
    attempt: number;
    startsAt: Date;
    endsAt: Date;
    responseDeadlineAt: Date;
    status: "pending" | "secured" | "expired" | "cancelled";
    participantCount: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
    statusReason: string | null;
  } | null;
};

export type SmartMeetingSyncStats = {
  checked: number;
  secured: number;
  expired: number;
  rescheduled: number;
  exhausted: number;
};

type Participant = {
  email: string;
  label: string;
  registeredUserId: string | null;
};

type PlanRecord = {
  id: string;
  createdBy: string;
  groupId: string;
  title: string;
  description: string | null;
  location: string | null;
  tags: string;
  durationMinutes: number;
  minAcceptedParticipants: number;
  responseWindowHours: number;
  slotIntervalMinutes: number;
  maxAttempts: number;
  searchWindowStart: Date;
  searchWindowEnd: Date;
  status: "active" | "secured" | "exhausted" | "paused";
  latestRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RunRecord = {
  id: string;
  planId: string;
  attempt: number;
  eventId: string | null;
  startsAt: Date;
  endsAt: Date;
  responseDeadlineAt: Date;
  calendarEventId: string | null;
  invitedEmails: string;
  participantCount: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  status: "pending" | "secured" | "expired" | "cancelled";
  statusReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SlotCandidate = {
  startsAt: Date;
  endsAt: Date;
  expectedAccepted: number;
};

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    )
  );
}

function serializeStringList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(",");
}

function parseStringList(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return Array.from(new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean)));
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function computeReliabilityScore(stats: {
  acceptCount: number;
  declineCount: number;
  noResponseCount: number;
} | null) {
  if (!stats) {
    return 0.55;
  }

  const alpha = stats.acceptCount + 1.2;
  const beta = stats.declineCount + stats.noResponseCount + 1.2;
  const ratio = alpha / (alpha + beta);
  return Math.min(0.95, Math.max(0.1, ratio));
}

function buildTimeslotTag(startsAt: Date) {
  return createTimeslotPreferenceTag(startsAt);
}

function generateCandidateSlots(input: {
  searchWindowStart: Date;
  searchWindowEnd: Date;
  durationMinutes: number;
  slotIntervalMinutes: number;
  excludedStartTimes: Set<number>;
}) {
  const slotMs = input.slotIntervalMinutes * 60_000;
  const durationMs = input.durationMinutes * 60_000;

  if (slotMs <= 0 || durationMs <= 0 || input.searchWindowEnd <= input.searchWindowStart) {
    return [] as Array<{ startsAt: Date; endsAt: Date }>;
  }

  const nowBuffer = Date.now() + 5 * 60_000;
  const roundedStartMs = Math.ceil(input.searchWindowStart.getTime() / slotMs) * slotMs;
  let cursorMs = Math.max(roundedStartMs, nowBuffer);
  const latestStartMs = input.searchWindowEnd.getTime() - durationMs;
  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

  while (cursorMs <= latestStartMs && slots.length < MAX_CANDIDATE_SLOTS) {
    if (!input.excludedStartTimes.has(cursorMs)) {
      const startsAt = new Date(cursorMs);
      const endsAt = new Date(cursorMs + durationMs);
      slots.push({ startsAt, endsAt });
    }

    cursorMs += slotMs;
  }

  return slots;
}

async function listParticipantsForGroup(input: {
  ownerUserId: string;
  groupId: string;
}) {
  const db = getDb();

  const [owner, memberRows, contactRows] = await Promise.all([
    db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.ownerUserId))
      .limit(1),
    db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, input.groupId)),
    db
      .select({
        email: groupContacts.email,
        name: groupContacts.name
      })
      .from(groupContacts)
      .where(eq(groupContacts.groupId, input.groupId))
  ]);

  const ownerEmail = normalizeEmail(owner[0]?.email ?? "");
  const byEmail = new Map<string, Participant>();

  for (const row of memberRows) {
    const email = normalizeEmail(row.email);
    if (!email || email === ownerEmail) {
      continue;
    }

    byEmail.set(email, {
      email,
      label: row.name?.trim() || email,
      registeredUserId: row.userId
    });
  }

  for (const row of contactRows) {
    const email = normalizeEmail(row.email);
    if (!email || email === ownerEmail) {
      continue;
    }

    const existing = byEmail.get(email);
    byEmail.set(email, {
      email,
      label: existing?.label ?? row.name?.trim() ?? email,
      registeredUserId: existing?.registeredUserId ?? null
    });
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}

async function listPlanRuns(planId: string) {
  const db = getDb();
  return db
    .select({
      id: smartMeetingRuns.id,
      planId: smartMeetingRuns.planId,
      attempt: smartMeetingRuns.attempt,
      eventId: smartMeetingRuns.eventId,
      startsAt: smartMeetingRuns.startsAt,
      endsAt: smartMeetingRuns.endsAt,
      responseDeadlineAt: smartMeetingRuns.responseDeadlineAt,
      calendarEventId: smartMeetingRuns.calendarEventId,
      invitedEmails: smartMeetingRuns.invitedEmails,
      participantCount: smartMeetingRuns.participantCount,
      acceptedCount: smartMeetingRuns.acceptedCount,
      declinedCount: smartMeetingRuns.declinedCount,
      pendingCount: smartMeetingRuns.pendingCount,
      status: smartMeetingRuns.status,
      statusReason: smartMeetingRuns.statusReason,
      createdAt: smartMeetingRuns.createdAt,
      updatedAt: smartMeetingRuns.updatedAt
    })
    .from(smartMeetingRuns)
    .where(eq(smartMeetingRuns.planId, planId))
    .orderBy(asc(smartMeetingRuns.attempt));
}

async function listPlanById(planId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: smartMeetingPlans.id,
      createdBy: smartMeetingPlans.createdBy,
      groupId: smartMeetingPlans.groupId,
      title: smartMeetingPlans.title,
      description: smartMeetingPlans.description,
      location: smartMeetingPlans.location,
      tags: smartMeetingPlans.tags,
      durationMinutes: smartMeetingPlans.durationMinutes,
      minAcceptedParticipants: smartMeetingPlans.minAcceptedParticipants,
      responseWindowHours: smartMeetingPlans.responseWindowHours,
      slotIntervalMinutes: smartMeetingPlans.slotIntervalMinutes,
      maxAttempts: smartMeetingPlans.maxAttempts,
      searchWindowStart: smartMeetingPlans.searchWindowStart,
      searchWindowEnd: smartMeetingPlans.searchWindowEnd,
      status: smartMeetingPlans.status,
      latestRunId: smartMeetingPlans.latestRunId,
      createdAt: smartMeetingPlans.createdAt,
      updatedAt: smartMeetingPlans.updatedAt
    })
    .from(smartMeetingPlans)
    .where(eq(smartMeetingPlans.id, planId))
    .limit(1);

  return rows[0] ?? null;
}

async function loadParticipantPreferences(registeredUserIds: string[]) {
  if (!registeredUserIds.length) {
    return new Map<string, Map<string, number>>();
  }

  const db = getDb();
  const rows = await db
    .select({
      userId: tagPreferences.userId,
      tag: tagPreferences.tag,
      weight: tagPreferences.weight
    })
    .from(tagPreferences)
    .where(inArray(tagPreferences.userId, registeredUserIds));

  const byUser = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const map = byUser.get(row.userId) ?? new Map<string, number>();
    map.set(row.tag, row.weight);
    byUser.set(row.userId, map);
  }

  return byUser;
}

async function loadParticipantStats(ownerUserId: string, groupId: string) {
  const db = getDb();
  const rows = await db
    .select({
      email: smartMeetingMemberStats.email,
      registeredUserId: smartMeetingMemberStats.registeredUserId,
      acceptCount: smartMeetingMemberStats.acceptCount,
      declineCount: smartMeetingMemberStats.declineCount,
      noResponseCount: smartMeetingMemberStats.noResponseCount
    })
    .from(smartMeetingMemberStats)
    .where(
      and(
        eq(smartMeetingMemberStats.ownerUserId, ownerUserId),
        eq(smartMeetingMemberStats.groupId, groupId)
      )
    );

  const map = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    map.set(normalizeEmail(row.email), row);
  }

  return map;
}

async function loadBusyWindowsForParticipants(input: {
  participants: Participant[];
  timeMin: Date;
  timeMax: Date;
}) {
  const entries = await Promise.all(
    input.participants.map(async (participant) => {
      if (!participant.registeredUserId) {
        return [participant.email, null] as const;
      }

      try {
        const windows = await getBusyWindows({
          userId: participant.registeredUserId,
          timeMin: input.timeMin,
          timeMax: input.timeMax
        });

        if (windows === null) {
          return [participant.email, null] as const;
        }

        return [
          participant.email,
          windows.map((window) => ({
            start: new Date(window.start),
            end: new Date(window.end)
          }))
        ] as const;
      } catch {
        return [participant.email, null] as const;
      }
    })
  );

  return new Map(entries);
}

function getAvailabilityScore(
  participant: Participant,
  slot: { startsAt: Date; endsAt: Date },
  busyWindowsByEmail: Map<string, Array<{ start: Date; end: Date }> | null>
) {
  const windows = busyWindowsByEmail.get(participant.email) ?? null;
  if (!windows) {
    return 0.58;
  }

  const hasConflict = windows.some((window) => overlaps(slot.startsAt, slot.endsAt, window.start, window.end));
  return hasConflict ? 0.12 : 0.96;
}

function getAffinityScore(input: {
  participant: Participant;
  ownerUserId: string;
  planTags: string[];
  slotStartsAt: Date;
  preferenceMapByUser: Map<string, Map<string, number>>;
}) {
  if (!input.participant.registeredUserId) {
    return 0.58;
  }

  const preferenceMap = input.preferenceMapByUser.get(input.participant.registeredUserId);
  if (!preferenceMap) {
    return 0.55;
  }

  let score = 0.55;

  for (const tag of input.planTags) {
    score += (preferenceMap.get(tag) ?? 0) * 0.12;
  }

  score += (preferenceMap.get(createPersonPreferenceTag(input.ownerUserId)) ?? 0) * 0.06;
  score += (preferenceMap.get(buildTimeslotTag(input.slotStartsAt)) ?? 0) * 0.08;

  return Math.min(0.95, Math.max(0.05, score));
}

function getPredictedAttendanceProbability(input: {
  availabilityScore: number;
  affinityScore: number;
  reliabilityScore: number;
}) {
  const weighted =
    input.availabilityScore * 0.5 + input.affinityScore * 0.3 + input.reliabilityScore * 0.2;
  return Math.min(0.98, Math.max(0.03, weighted));
}

async function chooseBestSlot(input: {
  plan: PlanRecord;
  participants: Participant[];
  excludedStartTimes: Set<number>;
}) {
  const planTags = normalizeTags(parseStringList(input.plan.tags));
  const candidates = generateCandidateSlots({
    searchWindowStart: input.plan.searchWindowStart,
    searchWindowEnd: input.plan.searchWindowEnd,
    durationMinutes: input.plan.durationMinutes,
    slotIntervalMinutes: input.plan.slotIntervalMinutes,
    excludedStartTimes: input.excludedStartTimes
  });

  if (!candidates.length) {
    return null as SlotCandidate | null;
  }

  const registeredUserIds = Array.from(
    new Set(
      input.participants
        .map((participant) => participant.registeredUserId)
        .filter((userId): userId is string => Boolean(userId))
    )
  );

  const [preferenceMapByUser, statsByEmail, busyWindowsByEmail] = await Promise.all([
    loadParticipantPreferences(registeredUserIds),
    loadParticipantStats(input.plan.createdBy, input.plan.groupId),
    loadBusyWindowsForParticipants({
      participants: input.participants,
      timeMin: input.plan.searchWindowStart,
      timeMax: input.plan.searchWindowEnd
    })
  ]);

  let best: SlotCandidate | null = null;

  for (const candidate of candidates) {
    let expectedAccepted = 0;

    for (const participant of input.participants) {
      const availabilityScore = getAvailabilityScore(participant, candidate, busyWindowsByEmail);
      const affinityScore = getAffinityScore({
        participant,
        ownerUserId: input.plan.createdBy,
        planTags,
        slotStartsAt: candidate.startsAt,
        preferenceMapByUser
      });
      const reliabilityScore = computeReliabilityScore(statsByEmail.get(participant.email) ?? null);
      const predicted = getPredictedAttendanceProbability({
        availabilityScore,
        affinityScore,
        reliabilityScore
      });
      expectedAccepted += predicted;
    }

    const normalizedExpected = Number(expectedAccepted.toFixed(2));
    const scored: SlotCandidate = {
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      expectedAccepted: normalizedExpected
    };

    if (
      !best ||
      scored.expectedAccepted > best.expectedAccepted ||
      (scored.expectedAccepted === best.expectedAccepted && scored.startsAt < best.startsAt)
    ) {
      best = scored;
    }
  }

  return best;
}

async function updatePlanStatus(input: {
  planId: string;
  status: "active" | "secured" | "exhausted" | "paused";
  latestRunId?: string | null;
}) {
  const db = getDb();
  await db
    .update(smartMeetingPlans)
    .set({
      status: input.status,
      ...(input.latestRunId !== undefined ? { latestRunId: input.latestRunId } : {}),
      updatedAt: new Date()
    })
    .where(eq(smartMeetingPlans.id, input.planId));
}

async function insertRunForPlan(input: {
  plan: PlanRecord;
  attempt: number;
  slot: SlotCandidate;
  participants: Participant[];
}) {
  const attendeeEmails = input.participants.map((participant) => participant.email);
  const normalizedTags = normalizeTags(parseStringList(input.plan.tags));

  const event = await createEvent({
    userId: input.plan.createdBy,
    title: input.plan.title,
    description: input.plan.description ?? undefined,
    location: input.plan.location ?? undefined,
    startsAt: input.slot.startsAt,
    endsAt: input.slot.endsAt,
    visibility: "group" as EventVisibility,
    groupId: input.plan.groupId,
    tags: normalizedTags
  });

  const settings = await getUserSuggestionSettings(input.plan.createdBy);
  const calendarEventId = await insertGroupMeetingIntoCalendar({
    userId: input.plan.createdBy,
    eventId: event.id,
    title: input.plan.title,
    description: input.plan.description,
    location: input.plan.location,
    startsAt: input.slot.startsAt,
    endsAt: input.slot.endsAt,
    attendeeEmails,
    calendarId: settings.suggestionCalendarId
  });

  if (!calendarEventId) {
    await deleteEventsByIds([event.id]);
    throw new SmartMeetingValidationError(
      "Smart-Meeting benötigt einen verbundenen Google Kalender mit Schreibrechten."
    );
  }

  const db = getDb();
  const now = Date.now();
  const preferredDeadline = now + input.plan.responseWindowHours * 60 * 60 * 1000;
  const latestUsefulDeadline = input.slot.startsAt.getTime() - 30 * 60 * 1000;
  const deadlineMs = Math.max(now + 10 * 60 * 1000, Math.min(preferredDeadline, latestUsefulDeadline));
  const [run] = await db
    .insert(smartMeetingRuns)
    .values({
      planId: input.plan.id,
      attempt: input.attempt,
      eventId: event.id,
      startsAt: input.slot.startsAt,
      endsAt: input.slot.endsAt,
      responseDeadlineAt: new Date(deadlineMs),
      calendarEventId,
      invitedEmails: serializeStringList(attendeeEmails),
      participantCount: attendeeEmails.length,
      acceptedCount: 0,
      declinedCount: 0,
      pendingCount: attendeeEmails.length,
      status: "pending",
      updatedAt: new Date()
    })
    .returning({
      id: smartMeetingRuns.id,
      planId: smartMeetingRuns.planId,
      attempt: smartMeetingRuns.attempt,
      eventId: smartMeetingRuns.eventId,
      startsAt: smartMeetingRuns.startsAt,
      endsAt: smartMeetingRuns.endsAt,
      responseDeadlineAt: smartMeetingRuns.responseDeadlineAt,
      calendarEventId: smartMeetingRuns.calendarEventId,
      invitedEmails: smartMeetingRuns.invitedEmails,
      participantCount: smartMeetingRuns.participantCount,
      acceptedCount: smartMeetingRuns.acceptedCount,
      declinedCount: smartMeetingRuns.declinedCount,
      pendingCount: smartMeetingRuns.pendingCount,
      status: smartMeetingRuns.status,
      statusReason: smartMeetingRuns.statusReason,
      createdAt: smartMeetingRuns.createdAt,
      updatedAt: smartMeetingRuns.updatedAt
    });

  await updatePlanStatus({
    planId: input.plan.id,
    status: "active",
    latestRunId: run.id
  });

  return run;
}

async function proposeNextRunForPlan(plan: PlanRecord) {
  const [runs, participants] = await Promise.all([
    listPlanRuns(plan.id),
    listParticipantsForGroup({
      ownerUserId: plan.createdBy,
      groupId: plan.groupId
    })
  ]);

  if (!participants.length) {
    throw new SmartMeetingValidationError(
      "In dieser Gruppe gibt es aktuell keine einladbaren Teilnehmer außer dir."
    );
  }

  const nextAttempt = runs.length + 1;
  if (nextAttempt > plan.maxAttempts) {
    await updatePlanStatus({
      planId: plan.id,
      status: "exhausted"
    });
    return null;
  }

  const excludedStartTimes = new Set(runs.map((run) => run.startsAt.getTime()));
  const slot = await chooseBestSlot({
    plan,
    participants,
    excludedStartTimes
  });

  if (!slot) {
    await updatePlanStatus({
      planId: plan.id,
      status: "exhausted"
    });
    return null;
  }

  return insertRunForPlan({
    plan,
    attempt: nextAttempt,
    slot,
    participants
  });
}

function classifyResponseStatus(status: CalendarAttendeeResponse["responseStatus"]) {
  if (status === "accepted") {
    return "accepted" as const;
  }

  if (status === "declined") {
    return "declined" as const;
  }

  return "no_response" as const;
}

async function applyParticipantLearning(input: {
  ownerUserId: string;
  groupId: string;
  responses: Array<{ email: string; outcome: "accepted" | "declined" | "no_response" }>;
  participantByEmail: Map<string, Participant>;
}) {
  const db = getDb();

  for (const response of input.responses) {
    const participant = input.participantByEmail.get(response.email);
    const acceptDelta = response.outcome === "accepted" ? 1 : 0;
    const declineDelta = response.outcome === "declined" ? 1 : 0;
    const noResponseDelta = response.outcome === "no_response" ? 1 : 0;

    await db
      .insert(smartMeetingMemberStats)
      .values({
        ownerUserId: input.ownerUserId,
        groupId: input.groupId,
        email: response.email,
        registeredUserId: participant?.registeredUserId ?? null,
        acceptCount: acceptDelta,
        declineCount: declineDelta,
        noResponseCount: noResponseDelta,
        lastResponse: response.outcome,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [
          smartMeetingMemberStats.ownerUserId,
          smartMeetingMemberStats.groupId,
          smartMeetingMemberStats.email
        ],
        set: {
          registeredUserId: participant?.registeredUserId ?? null,
          acceptCount: sql`${smartMeetingMemberStats.acceptCount} + ${acceptDelta}`,
          declineCount: sql`${smartMeetingMemberStats.declineCount} + ${declineDelta}`,
          noResponseCount: sql`${smartMeetingMemberStats.noResponseCount} + ${noResponseDelta}`,
          lastResponse: response.outcome,
          updatedAt: new Date()
        }
      });
  }
}

async function updateRunCounts(input: {
  runId: string;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  status?: "pending" | "secured" | "expired" | "cancelled";
  statusReason?: string | null;
}) {
  const db = getDb();
  await db
    .update(smartMeetingRuns)
    .set({
      acceptedCount: input.acceptedCount,
      declinedCount: input.declinedCount,
      pendingCount: input.pendingCount,
      ...(input.status ? { status: input.status } : {}),
      ...(input.statusReason !== undefined ? { statusReason: input.statusReason } : {}),
      updatedAt: new Date()
    })
    .where(eq(smartMeetingRuns.id, input.runId));
}

async function expireRunAndCleanup(input: {
  plan: PlanRecord;
  run: RunRecord;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  statusReason: string;
}) {
  await updateRunCounts({
    runId: input.run.id,
    acceptedCount: input.acceptedCount,
    declinedCount: input.declinedCount,
    pendingCount: input.pendingCount,
    status: "expired",
    statusReason: input.statusReason
  });

  if (input.run.calendarEventId) {
    try {
      await removeSuggestionCalendarEvent({
        userId: input.plan.createdBy,
        calendarEventRef: input.run.calendarEventId,
        preferredCalendarId: null
      });
    } catch {
      // Cleanup darf den Reschedule-Flow nicht blockieren.
    }
  }

  if (input.run.eventId) {
    await deleteEventsByIds([input.run.eventId]);
  }
}

async function secureRun(input: {
  plan: PlanRecord;
  run: RunRecord;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
}) {
  await updateRunCounts({
    runId: input.run.id,
    acceptedCount: input.acceptedCount,
    declinedCount: input.declinedCount,
    pendingCount: input.pendingCount,
    status: "secured",
    statusReason: "Mindestteilnehmerzahl erreicht"
  });

  await updatePlanStatus({
    planId: input.plan.id,
    status: "secured",
    latestRunId: input.run.id
  });
}

async function maybeReschedulePlan(plan: PlanRecord) {
  const refreshed = await listPlanById(plan.id);
  if (!refreshed || refreshed.status !== "active") {
    return null;
  }

  return proposeNextRunForPlan(refreshed);
}

export async function createSmartMeetingPlanWithInitialRun(input: CreateSmartMeetingInput) {
  const durationMinutes = clampInt(input.durationMinutes, 15, 24 * 60);
  const minAcceptedParticipants = clampInt(input.minAcceptedParticipants, 1, 50);
  const responseWindowHours = clampInt(
    input.responseWindowHours ?? DEFAULT_RESPONSE_WINDOW_HOURS,
    1,
    14 * 24
  );
  const slotIntervalMinutes = clampInt(
    input.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
    15,
    180
  );
  const maxAttempts = clampInt(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 1, 10);

  if (!input.title.trim()) {
    throw new SmartMeetingValidationError("Titel fehlt.");
  }

  if (input.searchWindowEnd <= input.searchWindowStart) {
    throw new SmartMeetingValidationError("Das Suchfenster ist ungültig.");
  }

  const allowed = await isGroupMember(input.groupId, input.userId);
  if (!allowed) {
    throw new SmartMeetingValidationError("Keine Berechtigung für diese Gruppe.");
  }

  const db = getDb();

  const [plan] = await db
    .insert(smartMeetingPlans)
    .values({
      createdBy: input.userId,
      groupId: input.groupId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      tags: serializeStringList(normalizeTags(input.tags ?? [])),
      durationMinutes,
      minAcceptedParticipants,
      responseWindowHours,
      slotIntervalMinutes,
      maxAttempts,
      searchWindowStart: input.searchWindowStart,
      searchWindowEnd: input.searchWindowEnd,
      status: "active",
      updatedAt: new Date()
    })
    .returning({
      id: smartMeetingPlans.id,
      createdBy: smartMeetingPlans.createdBy,
      groupId: smartMeetingPlans.groupId,
      title: smartMeetingPlans.title,
      description: smartMeetingPlans.description,
      location: smartMeetingPlans.location,
      tags: smartMeetingPlans.tags,
      durationMinutes: smartMeetingPlans.durationMinutes,
      minAcceptedParticipants: smartMeetingPlans.minAcceptedParticipants,
      responseWindowHours: smartMeetingPlans.responseWindowHours,
      slotIntervalMinutes: smartMeetingPlans.slotIntervalMinutes,
      maxAttempts: smartMeetingPlans.maxAttempts,
      searchWindowStart: smartMeetingPlans.searchWindowStart,
      searchWindowEnd: smartMeetingPlans.searchWindowEnd,
      status: smartMeetingPlans.status,
      latestRunId: smartMeetingPlans.latestRunId,
      createdAt: smartMeetingPlans.createdAt,
      updatedAt: smartMeetingPlans.updatedAt
    });

  try {
    const run = await proposeNextRunForPlan(plan);
    if (!run) {
      throw new SmartMeetingValidationError("Es konnte kein passender Zeitpunkt im Suchfenster gefunden werden.");
    }

    return {
      planId: plan.id,
      runId: run.id,
      startsAt: run.startsAt,
      endsAt: run.endsAt,
      expectedParticipantCount: run.participantCount
    };
  } catch (error) {
    await db.delete(smartMeetingPlans).where(eq(smartMeetingPlans.id, plan.id));
    throw error;
  }
}

export async function syncSmartMeetingsForUser(userId: string): Promise<SmartMeetingSyncStats> {
  const db = getDb();
  const stats: SmartMeetingSyncStats = {
    checked: 0,
    secured: 0,
    expired: 0,
    rescheduled: 0,
    exhausted: 0
  };

  const pending = await db
    .select({
      planId: smartMeetingPlans.id,
      createdBy: smartMeetingPlans.createdBy,
      groupId: smartMeetingPlans.groupId,
      title: smartMeetingPlans.title,
      description: smartMeetingPlans.description,
      location: smartMeetingPlans.location,
      tags: smartMeetingPlans.tags,
      durationMinutes: smartMeetingPlans.durationMinutes,
      minAcceptedParticipants: smartMeetingPlans.minAcceptedParticipants,
      responseWindowHours: smartMeetingPlans.responseWindowHours,
      slotIntervalMinutes: smartMeetingPlans.slotIntervalMinutes,
      maxAttempts: smartMeetingPlans.maxAttempts,
      searchWindowStart: smartMeetingPlans.searchWindowStart,
      searchWindowEnd: smartMeetingPlans.searchWindowEnd,
      planStatus: smartMeetingPlans.status,
      latestRunId: smartMeetingPlans.latestRunId,
      planCreatedAt: smartMeetingPlans.createdAt,
      planUpdatedAt: smartMeetingPlans.updatedAt,
      runId: smartMeetingRuns.id,
      attempt: smartMeetingRuns.attempt,
      eventId: smartMeetingRuns.eventId,
      startsAt: smartMeetingRuns.startsAt,
      endsAt: smartMeetingRuns.endsAt,
      responseDeadlineAt: smartMeetingRuns.responseDeadlineAt,
      calendarEventId: smartMeetingRuns.calendarEventId,
      invitedEmails: smartMeetingRuns.invitedEmails,
      participantCount: smartMeetingRuns.participantCount,
      acceptedCount: smartMeetingRuns.acceptedCount,
      declinedCount: smartMeetingRuns.declinedCount,
      pendingCount: smartMeetingRuns.pendingCount,
      runStatus: smartMeetingRuns.status,
      statusReason: smartMeetingRuns.statusReason,
      runCreatedAt: smartMeetingRuns.createdAt,
      runUpdatedAt: smartMeetingRuns.updatedAt
    })
    .from(smartMeetingRuns)
    .innerJoin(smartMeetingPlans, eq(smartMeetingRuns.planId, smartMeetingPlans.id))
    .where(
      and(
        eq(smartMeetingPlans.createdBy, userId),
        eq(smartMeetingPlans.status, "active"),
        eq(smartMeetingRuns.status, "pending")
      )
    )
    .orderBy(asc(smartMeetingRuns.responseDeadlineAt));

  for (const row of pending) {
    stats.checked += 1;

    const plan: PlanRecord = {
      id: row.planId,
      createdBy: row.createdBy,
      groupId: row.groupId,
      title: row.title,
      description: row.description,
      location: row.location,
      tags: row.tags,
      durationMinutes: row.durationMinutes,
      minAcceptedParticipants: row.minAcceptedParticipants,
      responseWindowHours: row.responseWindowHours,
      slotIntervalMinutes: row.slotIntervalMinutes,
      maxAttempts: row.maxAttempts,
      searchWindowStart: row.searchWindowStart,
      searchWindowEnd: row.searchWindowEnd,
      status: row.planStatus,
      latestRunId: row.latestRunId,
      createdAt: row.planCreatedAt,
      updatedAt: row.planUpdatedAt
    };

    const run: RunRecord = {
      id: row.runId,
      planId: row.planId,
      attempt: row.attempt,
      eventId: row.eventId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      responseDeadlineAt: row.responseDeadlineAt,
      calendarEventId: row.calendarEventId,
      invitedEmails: row.invitedEmails,
      participantCount: row.participantCount,
      acceptedCount: row.acceptedCount,
      declinedCount: row.declinedCount,
      pendingCount: row.pendingCount,
      status: row.runStatus,
      statusReason: row.statusReason,
      createdAt: row.runCreatedAt,
      updatedAt: row.runUpdatedAt
    };

    const invitedEmails = parseStringList(run.invitedEmails).map(normalizeEmail).filter(Boolean);
    const participants = await listParticipantsForGroup({
      ownerUserId: plan.createdBy,
      groupId: plan.groupId
    });
    const participantByEmail = new Map(participants.map((participant) => [participant.email, participant]));

    let attendeeResponses: CalendarAttendeeResponse[] = [];
    if (run.calendarEventId && invitedEmails.length) {
      attendeeResponses = await getCalendarAttendeeResponses({
        userId: plan.createdBy,
        calendarEventRef: run.calendarEventId,
        attendeeEmails: invitedEmails
      });
    }

    if (!attendeeResponses.length && invitedEmails.length) {
      attendeeResponses = invitedEmails.map((email) => ({
        email,
        responseStatus: "unknown" as const
      }));
    }

    let acceptedCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;

    for (const response of attendeeResponses) {
      if (response.responseStatus === "accepted") {
        acceptedCount += 1;
        continue;
      }

      if (response.responseStatus === "declined") {
        declinedCount += 1;
        continue;
      }

      pendingCount += 1;
    }

    const now = new Date();
    const everyoneDeclined = attendeeResponses.length > 0 && declinedCount === attendeeResponses.length;

    if (acceptedCount >= plan.minAcceptedParticipants) {
      await secureRun({
        plan,
        run,
        acceptedCount,
        declinedCount,
        pendingCount
      });

      await applyParticipantLearning({
        ownerUserId: plan.createdBy,
        groupId: plan.groupId,
        responses: attendeeResponses.map((response) => ({
          email: normalizeEmail(response.email),
          outcome: classifyResponseStatus(response.responseStatus)
        })),
        participantByEmail
      });

      stats.secured += 1;
      continue;
    }

    const deadlinePassed = now >= run.responseDeadlineAt;
    if (!deadlinePassed && !everyoneDeclined) {
      await updateRunCounts({
        runId: run.id,
        acceptedCount,
        declinedCount,
        pendingCount,
        statusReason: null
      });
      continue;
    }

    await expireRunAndCleanup({
      plan,
      run,
      acceptedCount,
      declinedCount,
      pendingCount,
      statusReason: everyoneDeclined
        ? "Alle eingeladenen Teilnehmer haben abgesagt"
        : "Mindestteilnehmerzahl bis zur Frist nicht erreicht"
    });

    await applyParticipantLearning({
      ownerUserId: plan.createdBy,
      groupId: plan.groupId,
      responses: attendeeResponses.map((response) => ({
        email: normalizeEmail(response.email),
        outcome: classifyResponseStatus(response.responseStatus)
      })),
      participantByEmail
    });

    stats.expired += 1;

    const nextRun = await maybeReschedulePlan(plan);
    if (nextRun) {
      stats.rescheduled += 1;
      continue;
    }

    stats.exhausted += 1;
  }

  return stats;
}

export async function listSmartMeetingsForUser(userId: string): Promise<SmartMeetingSummary[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: smartMeetingPlans.id,
      title: smartMeetingPlans.title,
      groupId: smartMeetingPlans.groupId,
      groupName: groups.name,
      status: smartMeetingPlans.status,
      tags: smartMeetingPlans.tags,
      minAcceptedParticipants: smartMeetingPlans.minAcceptedParticipants,
      responseWindowHours: smartMeetingPlans.responseWindowHours,
      maxAttempts: smartMeetingPlans.maxAttempts,
      searchWindowStart: smartMeetingPlans.searchWindowStart,
      searchWindowEnd: smartMeetingPlans.searchWindowEnd,
      createdAt: smartMeetingPlans.createdAt,
      updatedAt: smartMeetingPlans.updatedAt,
      latestRunId: smartMeetingPlans.latestRunId
    })
    .from(smartMeetingPlans)
    .innerJoin(groups, eq(smartMeetingPlans.groupId, groups.id))
    .where(eq(smartMeetingPlans.createdBy, userId))
    .orderBy(desc(smartMeetingPlans.updatedAt))
    .limit(25);

  const runIds = rows
    .map((row) => row.latestRunId)
    .filter((runId): runId is string => Boolean(runId));

  const runRows = runIds.length
    ? await db
        .select({
          id: smartMeetingRuns.id,
          attempt: smartMeetingRuns.attempt,
          startsAt: smartMeetingRuns.startsAt,
          endsAt: smartMeetingRuns.endsAt,
          responseDeadlineAt: smartMeetingRuns.responseDeadlineAt,
          status: smartMeetingRuns.status,
          participantCount: smartMeetingRuns.participantCount,
          acceptedCount: smartMeetingRuns.acceptedCount,
          declinedCount: smartMeetingRuns.declinedCount,
          pendingCount: smartMeetingRuns.pendingCount,
          statusReason: smartMeetingRuns.statusReason
        })
        .from(smartMeetingRuns)
        .where(inArray(smartMeetingRuns.id, runIds))
    : [];

  const runById = new Map(runRows.map((run) => [run.id, run]));

  return rows.map((row) => {
    const latestRun = row.latestRunId ? runById.get(row.latestRunId) ?? null : null;
    return {
      id: row.id,
      title: row.title,
      groupId: row.groupId,
      groupName: row.groupName,
      status: row.status,
      tags: normalizeTags(parseStringList(row.tags)),
      minAcceptedParticipants: row.minAcceptedParticipants,
      responseWindowHours: row.responseWindowHours,
      maxAttempts: row.maxAttempts,
      searchWindowStart: row.searchWindowStart,
      searchWindowEnd: row.searchWindowEnd,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            attempt: latestRun.attempt,
            startsAt: latestRun.startsAt,
            endsAt: latestRun.endsAt,
            responseDeadlineAt: latestRun.responseDeadlineAt,
            status: latestRun.status,
            participantCount: latestRun.participantCount,
            acceptedCount: latestRun.acceptedCount,
            declinedCount: latestRun.declinedCount,
            pendingCount: latestRun.pendingCount,
            statusReason: latestRun.statusReason
          }
        : null
    };
  });
}
