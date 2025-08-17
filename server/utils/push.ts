import type { ExpoPushMessage } from "expo-server-sdk";
import { Expo } from "expo-server-sdk";

import type { EventData } from "@realite/db/events";
import { and, eq, inArray } from "@realite/db";
import { db } from "@realite/db/client";
import { Event } from "@realite/db/schema";

import { saveEventWithAnalytics } from "./events";

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
export const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  /*
   * @deprecated
   * The optional useFcmV1 parameter defaults to true, as FCMv1 is now the default for the Expo push service.
   *
   * If using FCMv1, the useFcmV1 parameter may be omitted.
   * Set this to false to have Expo send to the legacy endpoint.
   *
   * See https://firebase.google.com/support/faq#deprecated-api-shutdown
   * for important information on the legacy endpoint shutdown.
   *
   * Once the legacy service is fully shut down, the parameter will be removed in a future PR.
   */
  useFcmV1: true,
});

async function getPushCountSince(userId: string, since: Date): Promise<number> {
  const events = await db.query.Event.findMany({
    where: (t, { and, eq, gt }) =>
      and(
        eq(t.type, "push-notification-sent"),
        eq(t.actorId, userId),
        gt(t.time, since),
      ),
    columns: { id: true },
  });
  return events.length;
}

export async function sendPushesToUser(pushes: ExpoPushMessage[]) {
  const userToToken = await getTokensForUsers(
    pushes.flatMap((p) => (Array.isArray(p.to) ? p.to : [p.to])),
  );
  const chunks = expo.chunkPushNotifications(
    pushes.map((push) =>
      Array.isArray(push.to)
        ? { ...push, to: push.to.flatMap((to) => userToToken[to] ?? []) }
        : { ...push, to: userToToken[push.to] ?? [] },
    ),
  );
  const tokenToUser = (token: string) => {
    for (const [userId, tokens] of Object.entries(userToToken)) {
      if (tokens.includes(token)) return userId;
    }
    return null;
  };
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === "ok") {
          console.log(`Push sent to ${ticket.id}`);
        } else {
          if (ticket.details) {
            const token = ticket.details.expoPushToken;
            if (token) {
              const userId = tokenToUser(token);
              if (userId) {
                console.error(
                  `Push failed to send to ${userId}: ${ticket.message}`,
                );
              }
            }
          }
          console.error(
            `Push failed to send to ${ticket.details?.expoPushToken}: ${ticket.message}`,
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

export async function getTokensForUsers(
  usersIds: string[],
): Promise<Record<string, string[]>> {
  const tokenEvents = await db.query.Event.findMany({
    where: and(
      eq(Event.type, "push-token-set"),
      inArray(Event.actorId, usersIds),
    ),
  });
  const events = tokenEvents as EventData[];
  const res: Record<string, string[]> = {};
  for (const event of events) {
    if (event.type !== "push-token-set") continue;
    res[event.actorId ?? ""] ??= [];
    const existingTokens = res[event.actorId ?? ""]!;
    if (existingTokens.includes(event.data.pushToken)) continue;
    existingTokens.push(event.data.pushToken);
  }
  return res;
}

export async function sendCappedPushesToUsers(
  pushes: (ExpoPushMessage & { to: string | string[] })[],
  maxPerDay = 3,
) {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tasks: Promise<void>[] = [];
  for (const msg of pushes) {
    const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
    for (const userId of recipients) {
      const count = await getPushCountSince(userId, since);
      if (count >= maxPerDay) continue;
      tasks.push(
        (async () => {
          await sendPushesToUser([{ ...msg, to: userId }]);
          await saveEventWithAnalytics(db, {
            type: "push-notification-sent",
            actorId: userId,
            subject: userId,
            data: {
              recipientUserId: userId,
              channel: "expo",
              title: msg.title ?? "",
              body: msg.body ?? "",
              data: (msg.data ?? undefined) as unknown,
            },
          });
        })(),
      );
    }
  }
  await Promise.allSettled(tasks);
}
