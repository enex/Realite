import { describe, expect, test } from "bun:test";

import { getSmartMeetingOverview } from "@/src/lib/smart-meeting-overview";

describe("smart meeting overview", () => {
  test("prioritizes approval state in the summary", () => {
    const overview = getSmartMeetingOverview([
      { status: "active", latestRunStatus: "awaiting_approval" },
      { status: "active", latestRunStatus: "pending" },
    ]);

    expect(overview.awaitingApprovalCount).toBe(1);
    expect(overview.activeRunCount).toBe(2);
    expect(overview.title).toBe("1 Lauf wartet auf deine Freigabe");
    expect(overview.description).toContain("erst danach gehen Kalendereinladungen raus");
    expect(overview.nextStepTitle).toBe("Teilnehmerliste prüfen und bewusst freigeben");
  });

  test("keeps empty state focused on planning instead of discovery", () => {
    const overview = getSmartMeetingOverview([]);

    expect(overview.totalCount).toBe(0);
    expect(overview.title).toBe("Noch kein Smart Treffen im Planungsbereich");
    expect(overview.description).toContain("Für spontane Aktivitäten");
    expect(overview.nextStepDescription).toContain("konkrete Gruppe");
  });

  test("summarizes active planning runs when no approval is pending", () => {
    const overview = getSmartMeetingOverview([
      { status: "active", latestRunStatus: "pending" },
      { status: "active", latestRunStatus: null },
      { status: "paused", latestRunStatus: "cancelled" },
    ]);

    expect(overview.activeRunCount).toBe(2);
    expect(overview.pausedCount).toBe(1);
    expect(overview.title).toBe("2 Smart Treffen suchen gerade passende Termine");
    expect(overview.nextStepTitle).toBe("Lauf beobachten, dann auf Freigabe umschalten");
  });
});
