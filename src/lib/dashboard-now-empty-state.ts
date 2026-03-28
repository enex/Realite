import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import type { DashboardFeedFocus } from "@/src/lib/dashboard-feed";

type DashboardEmptyStateActionKind = "set-prioritized" | "show-create";

type DashboardEmptyStateAction = {
  label: string;
  href?: string;
  action?: DashboardEmptyStateActionKind;
};

export type DashboardNowEmptyState = {
  title: string;
  description: string;
  primary: DashboardEmptyStateAction;
  secondary?: DashboardEmptyStateAction;
};

type DashboardNowEmptyStateInput = {
  calendarConnectionState: CalendarConnectionState;
  feedFocus: DashboardFeedFocus;
  hasHiddenOwnPlanningEvents: boolean;
  hasJoinableActivity: boolean;
  searchQuery: string;
  suggestionCtaLabel: string;
  visibleGroupCount: number;
};

export function getDashboardNowEmptyState(input: DashboardNowEmptyStateInput): DashboardNowEmptyState | null {
  if (input.searchQuery.trim()) {
    return null;
  }

  if (input.feedFocus === "momentum") {
    return {
      title: input.hasJoinableActivity ? "Gerade noch kein sichtbares Momentum" : "Gerade nichts Offenes mit Momentum",
      description: input.hasJoinableActivity
        ? "Sobald andere sichtbar zugesagt haben, tauchen Aktivitäten hier gesammelt auf. Bis dahin hilft dir der priorisierte Fokus für den ersten Mitmach-Schritt."
        : "Aktuell gibt es weder sichtbare Zusagen noch offene Mitmach-Aktivitäten. Reagiere auf Vorschläge, prüfe später noch einmal oder starte selbst etwas.",
      primary: {
        label: "Priorisiert öffnen",
        href: "/now",
        action: "set-prioritized",
      },
      secondary: {
        label: input.suggestionCtaLabel,
        href: "/suggestions",
      },
    };
  }

  if (input.feedFocus === "involved") {
    return {
      title: "Gerade keine direkte Beteiligung",
      description:
        "Hier erscheinen nur Aktivitäten, an denen du schon beteiligt bist oder die du selbst gestartet hast. Wechsle zurück auf Priorisiert, um wieder offene Aktivitäten zum Reagieren und Mitmachen zu sehen.",
      primary: {
        label: "Priorisiert öffnen",
        href: "/now",
        action: "set-prioritized",
      },
      secondary: {
        label: "Events ansehen",
        href: "/events#events",
      },
    };
  }

  if (input.hasHiddenOwnPlanningEvents) {
    return {
      title: "Gerade nichts Offenes zum Mitmachen",
      description:
        "In Jetzt wartet aktuell weder ein offener Vorschlag noch eine joinbare Aktivität. Deine eigene Planung liegt bewusst separat in Events, damit der Hauptfeed nicht nach Verwaltung aussieht.",
      primary: {
        label: "Planung öffnen",
        href: "/events#events",
      },
      secondary: {
        label: "Aktivität erstellen",
        action: "show-create",
      },
    };
  }

  if (input.visibleGroupCount === 0) {
    return {
      title: "Gerade noch kein Relevanzkontext",
      description:
        "Im Moment gibt es weder offene Vorschläge noch sichtbare joinbare Aktivitäten. Lege zuerst einen Kreis an oder starte selbst etwas, damit Realite mehr passenden sozialen Kontext bekommt.",
      primary: {
        label: "Gruppen öffnen",
        href: "/groups",
      },
      secondary: {
        label: "Aktivität erstellen",
        action: "show-create",
      },
    };
  }

  if (input.calendarConnectionState !== "connected") {
    return {
      title: "Gerade noch kein offener Timing-Kontext",
      description:
        "Deine Kreise stehen schon, aber aktuell gibt es weder offene Vorschläge noch joinbare Aktivitäten. Ohne Kalender priorisiert Realite vorsichtiger; du kannst selbst etwas starten oder später in den Einstellungen mehr Zeitkontext freischalten.",
      primary: {
        label: "Aktivität erstellen",
        action: "show-create",
      },
      secondary: {
        label: "Einstellungen öffnen",
        href: "/settings",
      },
    };
  }

  return {
    title: "Gerade noch kein neuer offener Kontext",
    description:
      "Im Moment gibt es weder offene Vorschläge noch sichtbare joinbare Aktivitäten. Deine Kreise stehen schon; sobald neuer Kontext auftaucht, landet er hier priorisiert. Bis dahin kannst du selbst etwas starten oder deine Planung in Events prüfen.",
    primary: {
      label: "Aktivität erstellen",
      action: "show-create",
    },
    secondary: {
      label: "Events ansehen",
      href: "/events#events",
    },
  };
}
