import type { ExpoPushMessage } from "expo-server-sdk";
import type { PushSubscription as WebPushSubscription } from "web-push";
import webpush from "web-push";
import { DB } from "../db";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    "mailto:support@realite.app",
    vapidPublic,
    vapidPrivate
  );
}

export async function getWebPushSubscriptionsForUsers(
  userIds: string[],
  db: DB
): Promise<
  Record<
    string,
    { endpoint: string; keys?: { p256dh?: string; auth?: string } }[]
  >
> {
  const addEvents = (await db.query.Event.findMany({
    where: (t, { and, inArray }) =>
      and(
        eq(t.type, "web-push-subscription-added"),
        inArray(t.actorId, userIds)
      ),
  })) as EventData[];

  const removeEvents = (await db.query.Event.findMany({
    where: (t, { and, inArray }) =>
      and(
        eq(t.type, "web-push-subscription-removed"),
        inArray(t.actorId, userIds)
      ),
  })) as EventData[];

  const removedByUser = new Map<string, Set<string>>();
  for (const ev of removeEvents) {
    const userId = ev.actorId ?? "";
    const endpoint =
      (ev.data as { endpoint?: string } | undefined)?.endpoint ?? "";
    if (!removedByUser.has(userId)) removedByUser.set(userId, new Set());
    removedByUser.get(userId)!.add(endpoint);
  }

  const res: Record<
    string,
    { endpoint: string; keys?: { p256dh?: string; auth?: string } }[]
  > = {};
  for (const ev of addEvents) {
    const userId = ev.actorId ?? "";
    const sub = (
      ev.data as
        | {
            subscription?: {
              endpoint: string;
              keys?: { p256dh?: string; auth?: string };
            };
          }
        | undefined
    )?.subscription;
    if (!sub) continue;
    const removed = removedByUser.get(userId);
    if (removed?.has(sub.endpoint)) continue;
    res[userId] ??= [];
    // avoid duplicates by endpoint
    if (!res[userId].some((s) => s.endpoint === sub.endpoint)) {
      res[userId].push(sub);
    }
  }
  return res;
}

async function getWebPushCountSince(
  userId: string,
  since: Date,
  db: DB
): Promise<number> {
  const events = await db.query.Event.findMany({
    where: (t, { and, eq, gt }) =>
      and(
        eq(t.type, "push-notification-sent"),
        eq(t.actorId, userId),
        gt(t.time, since)
      ),
    columns: { id: true },
  });
  return events.length;
}

export async function sendWebPushToUsers(
  messages: (Omit<ExpoPushMessage, "to"> & { to: string | string[] })[],
  db: DB = defaultDb
): Promise<void> {
  if (!vapidPublic || !vapidPrivate) return;
  // Collect referenced userIds for potential prefetching (unused for now)

  const userIds = messages.flatMap((m) =>
    Array.isArray(m.to) ? m.to : [m.to]
  );
  const userToSubs = await getWebPushSubscriptionsForUsers(userIds, db);
  const tasks: Promise<unknown>[] = [];
  for (const msg of messages) {
    const targets = Array.isArray(msg.to) ? msg.to : [msg.to];
    for (const userId of targets) {
      const subs = userToSubs[userId] ?? [];
      for (const sub of subs) {
        const payload = JSON.stringify({
          title: msg.title,
          body: msg.body,
          data: msg.data,
        });
        const p256dh = sub.keys?.p256dh;
        const auth = sub.keys?.auth;
        if (!p256dh || !auth) continue;
        const pushSubscription: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh, auth },
        };
        tasks.push(
          webpush
            .sendNotification(pushSubscription, payload)
            .then(async () => {
              await saveEventWithAnalytics(db, {
                type: "push-notification-sent",
                actorId: userId,
                subject: userId,
                data: {
                  recipientUserId: userId,
                  channel: "web",
                  title: msg.title ?? "",
                  body: msg.body ?? "",
                  data: msg.data,
                },
              });
            })
            .catch(() => undefined)
        );
      }
    }
  }
  await Promise.allSettled(tasks);
}

export async function sendCappedWebPushToUsers(
  messages: (Omit<ExpoPushMessage, "to"> & { to: string | string[] })[],
  maxPerDay = 3,
  db: DB = defaultDb
): Promise<void> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tasks: Promise<void>[] = [];
  for (const msg of messages) {
    const targets = Array.isArray(msg.to) ? msg.to : [msg.to];
    for (const userId of targets) {
      const count = await getWebPushCountSince(userId, since, db);
      if (count >= maxPerDay) continue;
      tasks.push(
        (async () => {
          await sendWebPushToUsers([{ ...msg, to: userId }], db);
        })()
      );
    }
  }
  await Promise.allSettled(tasks);
}
