import { useEffect, useState } from "react";
import { type FeatureFlagValue, type JsonType } from "@posthog/core";
import { usePostHog } from "posthog-react-native";

export function useFeatureFlag(flag: string): FeatureFlagValue | undefined {
  const posthog = usePostHog();
  const [featureFlag, setFeatureFlag] = useState<FeatureFlagValue | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!posthog) return;
    setFeatureFlag(posthog.getFeatureFlag(flag));
    return posthog.onFeatureFlags(() => {
      setFeatureFlag(posthog.getFeatureFlag(flag));
    });
  }, [posthog, flag]);

  return featureFlag;
}

export function useFeatureFlagPayload<T extends JsonType = JsonType>(
  flag: string,
): T | undefined {
  const posthog = usePostHog();
  const [payload, setPayload] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!posthog) return;
    setPayload(posthog.getFeatureFlagPayload(flag) as T | undefined);
    return posthog.onFeatureFlags(() => {
      setPayload(posthog.getFeatureFlagPayload(flag) as T | undefined);
    });
  }, [posthog, flag]);

  return payload;
}

export function useFeatureFlagBoolean(flag: string, fallback = false): boolean {
  const value = useFeatureFlag(flag);
  return typeof value === "boolean" ? value : fallback;
}
