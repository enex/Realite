"use client";

import { useCallback, useEffect, useState } from "react";

import {
  PWA_RETURN_PATH_COOKIE,
  PWA_RETURN_PATH_MAX_AGE_SECONDS,
  getSafePwaReturnPath,
} from "@/src/lib/pwa-return-path";

const PWA_DISMISS_KEY = "realite-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getCurrentReturnPath(): string | null {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (window.location.pathname === "/login") {
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    return getSafePwaReturnPath(callbackUrl) ?? getSafePwaReturnPath(currentPath);
  }

  return getSafePwaReturnPath(currentPath);
}

function setPwaReturnPathCookie(path: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PWA_RETURN_PATH_COOKIE}=${encodeURIComponent(path)}; Max-Age=${PWA_RETURN_PATH_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function clearPwaReturnPathCookie() {
  document.cookie = `${PWA_RETURN_PATH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wasDismissed = localStorage.getItem(PWA_DISMISS_KEY) === "true";
    if (isStandalone() || wasDismissed) {
      setDismissed(true);
      return;
    }
    setDismissed(wasDismissed);

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const returnPath = getCurrentReturnPath();
    if (returnPath) {
      setPwaReturnPathCookie(returnPath);
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    } else {
      clearPwaReturnPathCookie();
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(PWA_DISMISS_KEY, "true");
  }, []);

  if (!mounted || dismissed || !deferredPrompt) return null;

  return (
    <div
      role="region"
      aria-label="App installieren"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:bottom-auto sm:top-4 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:rounded-lg sm:border sm:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          Realite als App installieren für schnelleren Zugriff.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-[#2F5D50] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#264a40]"
          >
            Installieren
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
