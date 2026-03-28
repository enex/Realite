import type { EventVisibility } from "@/src/lib/event-visibility";

type DashboardJoinCopy = {
  questionValue: string;
  questionDescription: string;
  nextStepTitle: string;
  nextStepDescription: string;
  eventsReturnDescription: string;
};

export function getDashboardJoinFirstCopy(input: {
  groupName: string | null;
  visibility: EventVisibility;
}): DashboardJoinCopy {
  if (input.groupName) {
    return {
      questionValue: `1 Aktivität aus ${input.groupName}`,
      questionDescription:
        "Gerade ist vor allem eine sichtbare Aktivität aus deinem Kreis offen. Du könntest dort die erste klare Zusage im passenden Kontext setzen.",
      nextStepTitle: "Erste Zusage im Kreis setzen",
      nextStepDescription:
        `Gerade gibt es eine sichtbare Aktivität aus ${input.groupName} ohne Zusagen. Wenn sie passt, kannst du dort den ersten klaren Mitmach-Schritt im bestehenden Kreis setzen.`,
      eventsReturnDescription:
        `Dort prüfst du die nächste sichtbare Aktivität aus ${input.groupName}, bei der du ohne viel Abstimmung direkt einsteigen kannst.`,
    };
  }

  if (input.visibility === "public") {
    return {
      questionValue: "1 offene Aktivität für schnellen Einstieg",
      questionDescription:
        "Gerade ist eine offen sichtbare Aktivität ohne Zusagen da. Wenn sie passt, kannst du hier den ersten öffentlichen Einstieg setzen.",
      nextStepTitle: "Erste offene Aktivität prüfen",
      nextStepDescription:
        "Gerade gibt es eine offen sichtbare Aktivität ohne Zusagen. Wenn sie passt, kannst du dort den ersten klaren Mitmach-Schritt setzen.",
      eventsReturnDescription:
        "Dort prüfst du zuerst die nächste offen sichtbare Aktivität, bei der du ohne viel Abstimmung direkt einsteigen kannst.",
    };
  }

  return {
    questionValue: "1 sichtbare Aktivität zum Mitmachen",
    questionDescription: "Es gibt eine sichtbare Aktivität ohne Zusagen. Du könntest den ersten Schritt machen.",
    nextStepTitle: "Erste Zusage für offene Aktivität setzen",
    nextStepDescription:
      "Gerade gibt es eine sichtbare Aktivität ohne Zusagen. Wenn sie passt, kannst du hier den ersten klaren Mitmach-Schritt setzen.",
    eventsReturnDescription:
      "Dort prüfst du die nächste sichtbare Aktivität, bei der du ohne viel Abstimmung direkt einsteigen kannst.",
  };
}
