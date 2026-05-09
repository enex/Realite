"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/src/components/toaster";

const PUSH_DECLINED_KEY = "realite-web-push-declined";
const PUSH_NEXT_PROMPT_AT_KEY = "realite-web-push-next-prompt-at";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type PromptState =
  | "hidden"
  | "ready"
  | "ios_install_required"
  | "enabled"
  | "unavailable";

function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isCooldownActive() {
  const nextPromptAt = Number(localStorage.getItem(PUSH_NEXT_PROMPT_AT_KEY));
  return Number.isFinite(nextPromptAt) && nextPromptAt > Date.now();
}

function deferPromptUntilTomorrow() {
  localStorage.setItem(
    PUSH_NEXT_PROMPT_AT_KEY,
    String(Date.now() + ONE_DAY_MS),
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getPushConfig() {
  const response = await fetch("/api/push/subscription", {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as {
    supported: boolean;
    publicKey: string | null;
  };
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Push-Benachrichtigung konnte nicht gespeichert werden.");
  }
}

export function WebPushCheckInCard({ active }: { active: boolean }) {
  const [promptState, setPromptState] = useState<PromptState>("hidden");
  const [busy, setBusy] = useState(false);

  const canUseBrowserPush = useMemo(
    () =>
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
    [],
  );

  const refreshState = useCallback(async () => {
    if (!active) {
      setPromptState("hidden");
      return;
    }
    if (localStorage.getItem(PUSH_DECLINED_KEY) === "true") {
      setPromptState("hidden");
      return;
    }
    if (
      isIos() &&
      !isStandalonePwa() &&
      Notification.permission !== "granted" &&
      !isCooldownActive()
    ) {
      setPromptState("ios_install_required");
      return;
    }
    if (!canUseBrowserPush) {
      setPromptState("unavailable");
      return;
    }
    if (Notification.permission === "granted") {
      setPromptState("enabled");
      return;
    }
    if (Notification.permission === "denied") {
      localStorage.setItem(PUSH_DECLINED_KEY, "true");
      setPromptState("hidden");
      return;
    }
    if (isCooldownActive()) {
      setPromptState("hidden");
      return;
    }
    const config = await getPushConfig();
    setPromptState(config?.supported ? "ready" : "unavailable");
  }, [active, canUseBrowserPush]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const enablePush = useCallback(async () => {
    setBusy(true);
    try {
      const config = await getPushConfig();
      if (!config?.publicKey) {
        throw new Error("Push ist auf diesem Server noch nicht eingerichtet.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        deferPromptUntilTomorrow();
        if (permission === "denied") {
          localStorage.setItem(PUSH_DECLINED_KEY, "true");
        }
        setPromptState("hidden");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));

      await saveSubscription(subscription);
      localStorage.removeItem(PUSH_NEXT_PROMPT_AT_KEY);
      setPromptState("enabled");
      toast.success("Push-Benachrichtigungen sind aktiv.");
    } catch (error) {
      deferPromptUntilTomorrow();
      toast.error(
        error instanceof Error ? error.message : "Push konnte nicht aktiviert werden.",
      );
      setPromptState("hidden");
    } finally {
      setBusy(false);
    }
  }, []);

  const remindTomorrow = useCallback(() => {
    deferPromptUntilTomorrow();
    setPromptState("hidden");
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem(PUSH_DECLINED_KEY, "true");
    setPromptState("hidden");
  }, []);

  if (promptState === "hidden") {
    return null;
  }

  if (promptState === "enabled") {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
        Push-Benachrichtigungen sind aktiv. Realite kann dich informieren, wenn
        eine passende Person beim selben Event eincheckt.
      </div>
    );
  }

  if (promptState === "ios_install_required") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-semibold text-foreground">
          Benachrichtigungen nach dem Check-in
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Auf iPhone und iPad funktionieren Web-Push-Benachrichtigungen erst,
          wenn Realite zum Home-Bildschirm hinzugefügt und von dort geöffnet
          wurde. Danach kannst du Push hier aktivieren.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={remindTomorrow}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Morgen erinnern
          </button>
          <button
            type="button"
            onClick={decline}
            className="px-2 py-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Nicht mehr fragen
          </button>
        </div>
      </div>
    );
  }

  if (promptState === "unavailable") {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-foreground">
        Benachrichtigungen nach dem Check-in
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Realite kann dich informieren, wenn nach deinem Check-in eine passende
        Person beim selben Event sichtbar wird. Das ändert nichts an deiner
        Sichtbarkeit und veröffentlicht keinen Standort.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void enablePush()}
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Benachrichtigungen aktivieren
        </button>
        <button
          type="button"
          onClick={remindTomorrow}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Morgen erinnern
        </button>
        <button
          type="button"
          onClick={decline}
          className="px-2 py-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Nicht mehr fragen
        </button>
      </div>
    </div>
  );
}
