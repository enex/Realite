import type { SuggestionStatus } from "@/src/lib/repository";

type SuggestionCardVariant = "action" | "history";

export function getSuggestionStatusMeta(status: SuggestionStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Jetzt reagieren",
        description: "Dieser Vorschlag wartet noch auf deine Antwort",
        className: "bg-amber-100 text-amber-900"
      };
    case "calendar_inserted":
      return {
        label: "Im Kalender vorgemerkt",
        description: "Der Vorschlag liegt schon in deinem Kalender, braucht aber weiter deine Entscheidung",
        className: "bg-orange-100 text-orange-900"
      };
    case "accepted":
      return {
        label: "Zugesagt",
        description: "Du hast diese Aktivität bestätigt",
        className: "bg-teal-100 text-teal-900"
      };
    case "declined":
      return {
        label: "Abgelehnt",
        description: "Diesen Vorschlag hast du bewusst aussortiert",
        className: "bg-muted text-foreground"
      };
  }
}

export function getSuggestionNextAction(status: SuggestionStatus, variant: SuggestionCardVariant) {
  if (variant === "history") {
    return {
      label: status === "accepted" ? "Zusage steht" : "Bewusst abgelehnt",
      detail:
        status === "accepted"
          ? "Du bist für diese Aktivität bereits bestätigt."
          : "Der Vorschlag bleibt nur noch als Verlauf sichtbar.",
      ctaLabel: "Details öffnen"
    };
  }

  if (status === "calendar_inserted") {
    return {
      label: "Kalendereintrag prüfen",
      detail: "Der Termin ist vorgemerkt, aber Realite wartet weiter auf deine Zu- oder Absage.",
      ctaLabel: "Zu- oder absagen"
    };
  }

  return {
    label: "Jetzt reagieren",
    detail: "Öffne die Detailansicht und entscheide, ob du mitmachst oder absagst.",
    ctaLabel: "Jetzt antworten"
  };
}

export function getEventPatternMeta(input: { isOwnEvent: boolean; isAccepted: boolean }) {
  if (input.isAccepted) {
    return {
      label: "Du dabei",
      description: "Du hast bereits zugesagt",
      badgeClassName: "bg-card text-teal-800 ring-1 ring-teal-200",
      actionLabel: "Details ansehen",
      priority: "momentum" as const
    };
  }

  if (input.isOwnEvent) {
    return {
      label: "Deine Planung",
      description: "Von dir angelegt",
      badgeClassName: "bg-muted text-foreground",
      actionLabel: "Verwalten",
      priority: "planning" as const
    };
  }

  return {
    label: "Offene Aktivität",
    description: "Zum Mitmachen sichtbar",
    badgeClassName: "bg-amber-100 text-amber-900",
    actionLabel: "Mitmachen prüfen",
    priority: "reaction" as const
  };
}
