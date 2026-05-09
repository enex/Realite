import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        }
      }
    ]
  }
});

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

self.addEventListener("push", (event) => {
  let payload: PushPayload = {
    title: "Realite",
    body: "In Realite ist etwas Neues passiert.",
    url: "/",
    tag: "realite-update",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload = { ...payload, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Realite", {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/favicon.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === targetPath && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetPath);
      }),
  );
});

serwist.addEventListeners();
