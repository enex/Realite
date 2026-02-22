"use client";

import posthog from "posthog-js";

type CaptureProperties = Record<string, string | number | boolean | null | undefined>;

export function captureProductEvent(eventName: string, properties?: CaptureProperties) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  posthog.capture(eventName, properties);
}
