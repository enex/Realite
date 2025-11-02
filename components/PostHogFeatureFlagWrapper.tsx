import React from "react";
import { usePostHogAvailability } from "./SafePostHogProvider";

interface PostHogFeatureFlagWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component that only renders children when PostHog is available.
 * This prevents errors when components using useFeatureFlag are rendered
 * before PostHogProvider is mounted (e.g., during SSR).
 *
 * Usage:
 * ```tsx
 * <PostHogFeatureFlagWrapper fallback={<LoadingState />}>
 *   <ComponentThatUsesFeatureFlags />
 * </PostHogFeatureFlagWrapper>
 * ```
 */
export function PostHogFeatureFlagWrapper({
  children,
  fallback = null,
}: PostHogFeatureFlagWrapperProps) {
  const { isAvailable } = usePostHogAvailability();

  // Only render children when PostHog is available
  // This ensures PostHogProvider is in the tree when useFeatureFlag is called
  if (!isAvailable) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
