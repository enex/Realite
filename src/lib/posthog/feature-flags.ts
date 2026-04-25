"use client";

import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";

export function useRealiteFeatureFlag(flagKey: string, fallback = false) {
  const enabled = useFeatureFlagEnabled(flagKey);
  return enabled ?? fallback;
}

export function useRealiteFeatureFlagState(flagKey: string) {
  const enabled = useFeatureFlagEnabled(flagKey);
  return enabled ?? null;
}

export function useRealiteFeatureVariant(flagKey: string) {
  return useFeatureFlagVariantKey(flagKey) ?? null;
}
