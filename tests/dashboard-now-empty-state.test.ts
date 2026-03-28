import { describe, expect, test } from "bun:test";

import { getDashboardNowEmptyState } from "@/src/lib/dashboard-now-empty-state";

describe("dashboard now empty state", () => {
  test("prefers group setup when no relevance context exists yet", () => {
    expect(
      getDashboardNowEmptyState({
        calendarConnectionState: "not_connected",
        feedFocus: "prioritized",
        hasHiddenOwnPlanningEvents: false,
        hasJoinableActivity: false,
        searchQuery: "",
        suggestionCtaLabel: "Vorschläge prüfen",
        visibleGroupCount: 0,
      }),
    ).toEqual({
      title: "Gerade noch kein Relevanzkontext",
      primary: { label: "Gruppen öffnen", href: "/groups" },
      secondary: { label: "Aktivität erstellen", action: "show-create" },
      description:
        "Im Moment gibt es weder offene Vorschläge noch sichtbare joinbare Aktivitäten. Lege zuerst einen Kreis an oder starte selbst etwas, damit Realite mehr passenden sozialen Kontext bekommt.",
    });
  });

  test("points to settings when groups exist but timing context is still missing", () => {
    expect(
      getDashboardNowEmptyState({
        calendarConnectionState: "not_connected",
        feedFocus: "prioritized",
        hasHiddenOwnPlanningEvents: false,
        hasJoinableActivity: false,
        searchQuery: "",
        suggestionCtaLabel: "Vorschläge prüfen",
        visibleGroupCount: 2,
      }),
    ).toEqual({
      title: "Gerade noch kein offener Timing-Kontext",
      description:
        "Deine Kreise stehen schon, aber aktuell gibt es weder offene Vorschläge noch joinbare Aktivitäten. Ohne Kalender priorisiert Realite vorsichtiger; du kannst selbst etwas starten oder später in den Einstellungen mehr Zeitkontext freischalten.",
      primary: { label: "Aktivität erstellen", action: "show-create" },
      secondary: { label: "Einstellungen öffnen", href: "/settings" },
    });
  });

  test("falls back to planning review when the feed is empty but own planning is hidden", () => {
    expect(
      getDashboardNowEmptyState({
        calendarConnectionState: "connected",
        feedFocus: "prioritized",
        hasHiddenOwnPlanningEvents: true,
        hasJoinableActivity: false,
        searchQuery: "",
        suggestionCtaLabel: "Vorschläge prüfen",
        visibleGroupCount: 2,
      }),
    ).toEqual({
      title: "Gerade nichts Offenes zum Mitmachen",
      primary: { label: "Planung öffnen", href: "/events#events" },
      secondary: { label: "Aktivität erstellen", action: "show-create" },
      description:
        "In Jetzt wartet aktuell weder ein offener Vorschlag noch eine joinbare Aktivität. Deine eigene Planung liegt bewusst separat in Events, damit der Hauptfeed nicht nach Verwaltung aussieht.",
    });
  });

  test("returns null while the feed is filtered via search", () => {
    expect(
      getDashboardNowEmptyState({
        calendarConnectionState: "connected",
        feedFocus: "prioritized",
        hasHiddenOwnPlanningEvents: false,
        hasJoinableActivity: false,
        searchQuery: "lauf",
        suggestionCtaLabel: "Vorschläge prüfen",
        visibleGroupCount: 2,
      }),
    ).toBe(null);
  });
});
