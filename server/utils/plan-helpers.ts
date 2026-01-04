import { events, plans } from "@/db/schema";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { db } from "../db";
import type { RealiteEvents } from "../events";

/**
 * Get the last activity timestamp for a user (last event where user was actor)
 * Returns null if user has no events
 */
export async function getLastUserActivityTimestamp(
  userId: string
): Promise<Date | null> {
  const lastEvent = await db.query.events.findFirst({
    where: eq(events.actor, userId),
    orderBy: [desc(events.time)],
    columns: { time: true },
  });

  return lastEvent?.time ?? null;
}

/**
 * Check if a plan is a derived plan (created via joining another plan)
 * Returns the original plan info if it's a derived plan, null otherwise
 */
export async function isDerivedPlan(
  planId: string
): Promise<{ originalPlanId: string; originalCreatorId: string } | null> {
  // Check for the new plan.scheduled event with basedOn field
  const scheduledEvent = await db.query.events.findFirst({
    where: and(
      eq(events.type, "realite.plan.scheduled"),
      eq(events.subject, planId)
    ),
    orderBy: [desc(events.time)],
  });

  if (scheduledEvent) {
    const eventData = scheduledEvent.data as RealiteEvents["realite.plan.scheduled"];
    if (eventData?.basedOn) {
      return {
        originalPlanId: eventData.basedOn.planId,
        originalCreatorId: eventData.basedOn.userId,
      };
    }
  }

  return null;
}

/**
 * Get new plans that a user hasn't seen yet
 * A plan is considered "new" if it was created after the user's last activity.
 * This function is only called when the user hasn't been active for >48h.
 */
export async function getNewPlansForUser(
  userId: string,
  lastActivityTimestamp: Date | null
): Promise<{ id: string; title: string; createdAt: Date }[]> {
  if (!lastActivityTimestamp) {
    // If user has no activity, don't send reminders
    return [];
  }

  // Find plans created after user's last activity
  // These are plans the user hasn't seen yet
  const newPlans = await db.query.plans.findMany({
    where: and(
      // Plan was created after user's last activity
      gt(plans.createdAt, lastActivityTimestamp),
      // Don't include plans created by the user themselves
      ne(plans.creatorId, userId)
    ),
    columns: {
      id: true,
      title: true,
      createdAt: true,
    },
    limit: 100, // Limit to avoid too many results
  });

  return newPlans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    createdAt: plan.createdAt,
  }));
}
