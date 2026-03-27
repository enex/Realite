import { describe, expect, test } from "bun:test";

import { getDashboardNextStep, type DashboardNextStepInput } from "@/src/lib/dashboard-next-step";

function createInput(overrides: Partial<DashboardNextStepInput> = {}): DashboardNextStepInput {
  return {
    pendingSuggestionCount: overrides.pendingSuggestionCount ?? 0,
    joinableMomentumEventId: overrides.joinableMomentumEventId ?? null,
    nextJoinableEventId: overrides.nextJoinableEventId ?? null,
    nextRelevantEventId: overrides.nextRelevantEventId ?? null,
    hasHiddenOwnPlanningEvents: overrides.hasHiddenOwnPlanningEvents ?? false,
  };
}

describe("dashboard next step", () => {
  test("prioritizes open suggestions before other actions", () => {
    expect(
      getDashboardNextStep(
        createInput({
          pendingSuggestionCount: 2,
          joinableMomentumEventId: "event-momentum",
          nextJoinableEventId: "event-join",
          nextRelevantEventId: "event-relevant",
        }),
      ),
    ).toEqual({ kind: "react" });
  });

  test("prefers momentum before a first join", () => {
    expect(
      getDashboardNextStep(
        createInput({
          joinableMomentumEventId: "event-momentum",
          nextJoinableEventId: "event-join",
          nextRelevantEventId: "event-relevant",
        }),
      ),
    ).toEqual({ kind: "join-momentum", eventId: "event-momentum" });
  });

  test("falls back to the next joinable activity", () => {
    expect(
      getDashboardNextStep(
        createInput({
          nextJoinableEventId: "event-join",
          nextRelevantEventId: "event-relevant",
        }),
      ),
    ).toEqual({ kind: "join-first", eventId: "event-join" });
  });

  test("opens the next relevant activity when nothing is joinable", () => {
    expect(
      getDashboardNextStep(
        createInput({
          nextRelevantEventId: "event-relevant",
        }),
      ),
    ).toEqual({ kind: "open-activity", eventId: "event-relevant" });
  });

  test("reviews planning before suggesting creation when hidden planning exists", () => {
    expect(
      getDashboardNextStep(
        createInput({
          hasHiddenOwnPlanningEvents: true,
        }),
      ),
    ).toEqual({ kind: "review-planning" });
  });

  test("suggests creating a new activity as the last fallback", () => {
    expect(getDashboardNextStep(createInput())).toEqual({ kind: "create" });
  });
});
