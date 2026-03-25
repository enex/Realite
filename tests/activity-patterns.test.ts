import { describe, expect, test } from "bun:test";

import {
  getEventPatternMeta,
  getSuggestionNextAction,
  getSuggestionStatusMeta
} from "@/src/lib/activity-patterns";

describe("activity patterns", () => {
  test("maps suggestion statuses to consistent labels", () => {
    expect(getSuggestionStatusMeta("pending").label).toBe("Jetzt reagieren");
    expect(getSuggestionStatusMeta("calendar_inserted").label).toBe("Im Kalender vorgemerkt");
    expect(getSuggestionStatusMeta("accepted").label).toBe("Zugesagt");
    expect(getSuggestionStatusMeta("declined").label).toBe("Abgelehnt");
  });

  test("derives next actions for suggestion cards", () => {
    expect(getSuggestionNextAction("pending", "action").ctaLabel).toBe("Jetzt antworten");
    expect(getSuggestionNextAction("calendar_inserted", "action").label).toBe("Kalendereintrag prüfen");
    expect(getSuggestionNextAction("accepted", "history").label).toBe("Zusage steht");
    expect(getSuggestionNextAction("declined", "history").label).toBe("Bewusst abgelehnt");
  });

  test("derives event patterns for now and events cards", () => {
    expect(getEventPatternMeta({ isOwnEvent: false, isAccepted: false }).label).toBe("Offene Aktivität");
    expect(getEventPatternMeta({ isOwnEvent: true, isAccepted: false }).label).toBe("Deine Planung");
    expect(getEventPatternMeta({ isOwnEvent: false, isAccepted: true }).label).toBe("Du dabei");
  });
});
