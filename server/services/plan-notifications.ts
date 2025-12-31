import type { ExpoPushMessage } from "expo-server-sdk";
import { db } from "../db";
import { sendCappedPushesToUsers } from "../utils/push";
import { sendCappedWebPushToUsers } from "../utils/web-push";

/**
 * Send push notification to the original plan creator when someone participates
 */
export async function sendPlanParticipationNotification(
  originalCreatorId: string,
  participantId: string,
  planId: string
): Promise<void> {
  // Get participant name if available (optional, can be enhanced later)
  const message: ExpoPushMessage = {
    to: originalCreatorId,
    title: "Jemand möchte auch mitmachen",
    body: "Jemand hat bei deinem Plan mitgemacht!",
    data: {
      type: "plan-participation",
      planId,
      participantId,
    },
    sound: "default",
    priority: "default",
  };

  // Send via both channels (Expo and Web Push)
  await Promise.allSettled([
    sendCappedPushesToUsers([message]),
    sendCappedWebPushToUsers([message], 3, db),
  ]);
}

/**
 * Send push notification to the original plan creator when a derived plan is deleted
 */
export async function sendPlanDeletionNotification(
  originalCreatorId: string,
  deletedPlanId: string
): Promise<void> {
  const message: ExpoPushMessage = {
    to: originalCreatorId,
    title: "Plan wurde gelöscht",
    body: "Jemand hat den Plan, bei dem er mitgemacht hat, gelöscht.",
    data: {
      type: "plan-deletion",
      deletedPlanId,
    },
    sound: "default",
    priority: "default",
  };

  // Send via both channels (Expo and Web Push)
  await Promise.allSettled([
    sendCappedPushesToUsers([message]),
    sendCappedWebPushToUsers([message], 3, db),
  ]);
}

/**
 * Send reminder push notification to users who haven't been active for >48h
 * but have new plans they haven't seen
 */
export async function sendPlanReminderNotification(
  userId: string,
  newPlansCount: number
): Promise<void> {
  const message: ExpoPushMessage = {
    to: userId,
    title: "Neue Pläne für dich",
    body:
      newPlansCount === 1
        ? "Es gibt einen neuen Plan, den du noch nicht gesehen hast!"
        : `Es gibt ${newPlansCount} neue Pläne, die du noch nicht gesehen hast!`,
    data: {
      type: "plan-reminder",
      newPlansCount,
    },
    sound: "default",
    priority: "default",
  };

  // Send via both channels (Expo and Web Push)
  await Promise.allSettled([
    sendCappedPushesToUsers([message]),
    sendCappedWebPushToUsers([message], 3, db),
  ]);
}
