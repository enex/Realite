import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  getLastUserActivityTimestamp,
  getNewPlansForUser,
} from "../utils/plan-helpers";
import { sendPlanReminderNotification } from "./plan-notifications";

/**
 * Check all users and send reminder push notifications to those who:
 * - Haven't been active for >48 hours
 * - Have new plans they haven't seen yet
 */
export async function checkAndSendReminders(): Promise<{
  checked: number;
  notified: number;
  errors: number;
}> {
  console.log("Starting plan reminder check...");

  // Find all unique user IDs from registration events
  const registrationEvents = await db.query.events.findMany({
    where: eq(events.type, "realite.user.registered"),
    columns: { actor: true },
  });

  // Extract unique user IDs
  const userIds = new Set<string>();
  for (const event of registrationEvents) {
    if (event.actor) {
      userIds.add(event.actor);
    }
  }

  const uniqueUserIds = Array.from(userIds);
  console.log(`Found ${uniqueUserIds.length} registered users`);

  let checked = 0;
  let notified = 0;
  let errors = 0;

  // Process users in batches to avoid overwhelming the system
  const batchSize = 50;
  for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
    const batch = uniqueUserIds.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          checked++;

          // Get last activity timestamp
          const lastActivity = await getLastUserActivityTimestamp(userId);

          if (!lastActivity) {
            // User has no activity, skip
            return;
          }

          // Check if user was active in the last 48 hours
          const now = new Date();
          const fortyEightHoursAgo = new Date(
            now.getTime() - 48 * 60 * 60 * 1000
          );

          if (lastActivity > fortyEightHoursAgo) {
            // User was active recently, skip
            return;
          }

          // Find new plans for this user
          const newPlans = await getNewPlansForUser(userId, lastActivity);

          if (newPlans.length > 0) {
            // Send reminder notification
            await sendPlanReminderNotification(userId, newPlans.length);
            notified++;
            console.log(
              `Sent reminder to user ${userId}: ${newPlans.length} new plans`
            );
          }
        } catch (error) {
          errors++;
          console.error(`Error processing user ${userId}:`, error);
        }
      })
    );
  }

  console.log(
    `Reminder check completed: ${checked} checked, ${notified} notified, ${errors} errors`
  );

  return { checked, notified, errors };
}
