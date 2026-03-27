import { describe, expect, test } from "bun:test";

import {
  getDashboardRelevantActivityKind,
  getDashboardRelevantActivityMeta,
} from "@/src/lib/dashboard-relevant-activity";

describe("dashboard relevant activity", () => {
  test("treats accepted activities as their own state", () => {
    expect(getDashboardRelevantActivityKind({ isOwnEvent: false, isAccepted: true })).toBe("accepted");
  });

  test("treats own non-accepted events as planning", () => {
    expect(getDashboardRelevantActivityKind({ isOwnEvent: true, isAccepted: false })).toBe("planning");
  });

  test("treats foreign non-accepted events as open activities", () => {
    expect(getDashboardRelevantActivityKind({ isOwnEvent: false, isAccepted: false })).toBe("open");
  });

  test("returns dedicated copy for accepted fallback states", () => {
    const meta = getDashboardRelevantActivityMeta("accepted");

    expect(meta.questionTitle).toBe("Welche zugesagte Aktivität ist als Nächstes relevant?");
    expect(meta.nextStepTitle).toBe("Zugesagte Aktivität im Blick behalten");
    expect(meta.nextStepActionLabel).toBe("Zusage öffnen");
    expect(meta.nextStepPriority).toBe("momentum");
  });
});
