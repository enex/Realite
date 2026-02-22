"use client";

import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";

export function useRealiteFeatureFlag(flagKey: string, fallback = false) {
  const enabled = useFeatureFlagEnabled(flagKey);
  return enabled ?? fallback;
}

export function useRealiteFeatureVariant(flagKey: string) {
  return useFeatureFlagVariantKey(flagKey) ?? null;
}
