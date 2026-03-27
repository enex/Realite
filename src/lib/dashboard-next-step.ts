export type DashboardNextStepKind =
  | "react"
  | "join-momentum"
  | "join-first"
  | "open-activity"
  | "review-planning"
  | "create";

export type DashboardNextStepInput = {
  pendingSuggestionCount: number;
  joinableMomentumEventId: string | null;
  nextJoinableEventId: string | null;
  nextRelevantEventId: string | null;
  hasHiddenOwnPlanningEvents: boolean;
};

export type DashboardNextStep =
  | { kind: "react" }
  | { kind: "join-momentum"; eventId: string }
  | { kind: "join-first"; eventId: string }
  | { kind: "open-activity"; eventId: string }
  | { kind: "review-planning" }
  | { kind: "create" };

export function getDashboardNextStep(input: DashboardNextStepInput): DashboardNextStep {
  if (input.pendingSuggestionCount > 0) {
    return { kind: "react" };
  }

  if (input.joinableMomentumEventId) {
    return { kind: "join-momentum", eventId: input.joinableMomentumEventId };
  }

  if (input.nextJoinableEventId) {
    return { kind: "join-first", eventId: input.nextJoinableEventId };
  }

  if (input.nextRelevantEventId) {
    return { kind: "open-activity", eventId: input.nextRelevantEventId };
  }

  if (input.hasHiddenOwnPlanningEvents) {
    return { kind: "review-planning" };
  }

  return { kind: "create" };
}
