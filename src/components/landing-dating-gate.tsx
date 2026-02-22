"use client";

import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";

const DATING_MODE_FLAG = "dating-mode";

/**
 * Rendert Kinder nur, wenn der Feature-Flag "Dating-Modus" aktiv ist.
 * Für die Landing Page (Dating-Spotlight-Sektion).
 */
export function LandingDatingGate({ children }: { children: React.ReactNode }) {
  const enabled = useRealiteFeatureFlag(DATING_MODE_FLAG, false);
  if (!enabled) return null;
  return <>{children}</>;
}

/**
 * Badge "Dating optional" für die Hero-Section – nur sichtbar, wenn dating-mode aktiv ist.
 */
export function LandingDatingBadge() {
  const enabled = useRealiteFeatureFlag(DATING_MODE_FLAG, false);
  if (!enabled) return null;
  return <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Dating optional</span>;
}
