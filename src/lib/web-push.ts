import webpush, { type PushSubscription } from "web-push";

import {
  deleteWebPushSubscription,
  listWebPushSubscriptionsForUsers,
  type StoredWebPushSubscription,
} from "@/src/lib/repository";

export type WebPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ??
    process.env.REALITE_APP_URL ??
    "mailto:push@realite.app";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function toPushSubscription(
  subscription: StoredWebPushSubscription,
): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

export function getWebPushPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export async function sendWebPushToUsers(input: {
  userIds: string[];
  payload: WebPushPayload;
}) {
  const vapidConfig = getVapidConfig();
  if (!vapidConfig) {
    return { attempted: 0, sent: 0, skipped: "missing_vapid_config" as const };
  }

  webpush.setVapidDetails(
    vapidConfig.subject,
    vapidConfig.publicKey,
    vapidConfig.privateKey,
  );

  const subscriptions = await listWebPushSubscriptionsForUsers(input.userIds);
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          toPushSubscription(subscription),
          JSON.stringify(input.payload),
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await deleteWebPushSubscription(subscription.endpoint);
        }
      }
    }),
  );

  return { attempted: subscriptions.length, sent };
}
