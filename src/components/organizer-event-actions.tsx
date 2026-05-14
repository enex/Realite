"use client";

import { useState } from "react";

type OrganizerEventActionsProps = {
  eventId: string;
  eventUrl: string;
};

export function OrganizerEventActions({
  eventId,
  eventUrl,
}: OrganizerEventActionsProps) {
  const [copyDone, setCopyDone] = useState(false);
  const absoluteEventUrl =
    typeof window !== "undefined" && eventUrl.startsWith("/")
      ? `${window.location.origin}${eventUrl}`
      : eventUrl;

  async function track(metric: "event_share_copy" | "event_share_native") {
    await fetch("/api/organizer/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        metric,
        sourcePath: window.location.pathname,
      }),
    });
  }

  async function onCopy() {
    await navigator.clipboard.writeText(absoluteEventUrl);
    setCopyDone(true);
    void track("event_share_copy");
    window.setTimeout(() => setCopyDone(false), 1800);
  }

  async function onShare() {
    if (!navigator.share) {
      await onCopy();
      return;
    }
    try {
      await navigator.share({ url: absoluteEventUrl });
      void track("event_share_native");
    } catch {
      // user canceled share
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
      >
        {copyDone ? "Link kopiert" : "Link kopieren"}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
      >
        Teilen
      </button>
    </div>
  );
}
