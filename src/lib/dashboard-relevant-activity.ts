import type { VisualPriority } from "@/src/lib/visual-priority";

export type DashboardRelevantActivityKind = "open" | "accepted" | "planning" | "none";

type DashboardRelevantActivityMeta = {
  questionTitle: string;
  questionDescription: string;
  questionActionLabel: string;
  questionPriority: VisualPriority;
  nextStepTitle: string;
  nextStepDescription: string;
  nextStepActionLabel: string;
  nextStepPriority: VisualPriority;
};

const RELEVANT_ACTIVITY_META: Record<DashboardRelevantActivityKind, DashboardRelevantActivityMeta> = {
  open: {
    questionTitle: "Was ist als Nächstes konkret relevant?",
    questionDescription: "Das ist die nächste sichtbare Aktivität aus deinem Jetzt-Feed.",
    questionActionLabel: "Aktivität öffnen",
    questionPriority: "reaction",
    nextStepTitle: "Nächste relevante Aktivität öffnen",
    nextStepDescription:
      "Im Moment wartet keine neue Reaktion auf dich. Öffne die nächste relevante Aktivität, um Timing, Personen und Sichtbarkeit im Blick zu behalten.",
    nextStepActionLabel: "Aktivität öffnen",
    nextStepPriority: "reaction",
  },
  accepted: {
    questionTitle: "Welche zugesagte Aktivität ist als Nächstes relevant?",
    questionDescription:
      "Gerade liegt deine nächste relevante Sache in einer Aktivität, bei der du schon zugesagt hast.",
    questionActionLabel: "Zusage öffnen",
    questionPriority: "momentum",
    nextStepTitle: "Zugesagte Aktivität im Blick behalten",
    nextStepDescription:
      "Gerade wartet nichts Neues auf Reaktion oder Mitmachen. Öffne stattdessen deine nächste bestätigte Beteiligung, um Details, Personen und Timing im Blick zu behalten.",
    nextStepActionLabel: "Zusage öffnen",
    nextStepPriority: "momentum",
  },
  planning: {
    questionTitle: "Welche eigene Planung ist als Nächstes relevant?",
    questionDescription:
      "Gerade liegt dein nächster relevanter Schritt eher in deiner eigenen Planung als in neuer Discovery.",
    questionActionLabel: "Planung öffnen",
    questionPriority: "planning",
    nextStepTitle: "Deine nächste Aktivität prüfen",
    nextStepDescription:
      "Gerade gibt es wenig offenen Mitmach-Kontext. Prüfe stattdessen deine nächste sichtbare Aktivität mit Beteiligung oder Momentum.",
    nextStepActionLabel: "Planung öffnen",
    nextStepPriority: "planning",
  },
  none: {
    questionTitle: "Was ist als Nächstes konkret relevant?",
    questionDescription: "Sobald etwas Sichtbares oder Joinbares auftaucht, erscheint es hier zuerst.",
    questionActionLabel: "Events ansehen",
    questionPriority: "neutral",
    nextStepTitle: "Neue Aktivität starten",
    nextStepDescription:
      "Wenn weder offene Vorschläge noch passende Aktivitäten sichtbar sind, ist selbst erstellen der kürzeste nächste Schritt.",
    nextStepActionLabel: "Aktivität erstellen",
    nextStepPriority: "planning",
  },
};

export function getDashboardRelevantActivityKind(input: {
  isOwnEvent: boolean;
  isAccepted: boolean;
}): DashboardRelevantActivityKind {
  if (input.isAccepted) {
    return "accepted";
  }

  if (input.isOwnEvent) {
    return "planning";
  }

  return "open";
}

export function getDashboardRelevantActivityMeta(kind: DashboardRelevantActivityKind) {
  return RELEVANT_ACTIVITY_META[kind];
}
