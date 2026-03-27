export type SmartMeetingOverviewItem = {
  status: "active" | "secured" | "exhausted" | "paused";
  latestRunStatus: "awaiting_approval" | "pending" | "secured" | "expired" | "cancelled" | null;
};

export type SmartMeetingOverview = {
  totalCount: number;
  awaitingApprovalCount: number;
  activeRunCount: number;
  securedCount: number;
  pausedCount: number;
  exhaustedCount: number;
  title: string;
  description: string;
  nextStepTitle: string;
  nextStepDescription: string;
};

export function getSmartMeetingOverview(meetings: SmartMeetingOverviewItem[]): SmartMeetingOverview {
  const totalCount = meetings.length;
  const awaitingApprovalCount = meetings.filter((meeting) => meeting.latestRunStatus === "awaiting_approval").length;
  const activeRunCount = meetings.filter(
    (meeting) => meeting.status === "active" || meeting.latestRunStatus === "pending"
  ).length;
  const securedCount = meetings.filter((meeting) => meeting.status === "secured").length;
  const pausedCount = meetings.filter((meeting) => meeting.status === "paused").length;
  const exhaustedCount = meetings.filter((meeting) => meeting.status === "exhausted").length;

  if (awaitingApprovalCount > 0) {
    return {
      totalCount,
      awaitingApprovalCount,
      activeRunCount,
      securedCount,
      pausedCount,
      exhaustedCount,
      title:
        awaitingApprovalCount === 1
          ? "1 Lauf wartet auf deine Freigabe"
          : `${awaitingApprovalCount} Läufe warten auf deine Freigabe`,
      description:
        "Smart Treffen bleibt hier bewusst ein Orga-Bereich: Erst prüfen, dann Teilnehmerliste freigeben, erst danach gehen Kalendereinladungen raus.",
      nextStepTitle: "Teilnehmerliste prüfen und bewusst freigeben",
      nextStepDescription:
        "Kontrolliere die vorgeschlagenen Personen, wähle nur die passende Runde aus und sende Kalendereinladungen erst danach.",
    };
  }

  if (totalCount === 0) {
    return {
      totalCount,
      awaitingApprovalCount,
      activeRunCount,
      securedCount,
      pausedCount,
      exhaustedCount,
      title: "Noch kein Smart Treffen im Planungsbereich",
      description:
        "Nutze Smart Treffen nur für Gruppen-Orga unter Events. Für spontane Aktivitäten, offene Vorschläge und schnelles Mitmachen bleibt Jetzt zuständig.",
      nextStepTitle: "Nur einen planbaren Gruppenlauf anlegen",
      nextStepDescription:
        "Starte hier nur dann eine Suche, wenn du für eine konkrete Gruppe einen gemeinsamen Termin koordinieren willst.",
    };
  }

  if (activeRunCount > 0) {
    return {
      totalCount,
      awaitingApprovalCount,
      activeRunCount,
      securedCount,
      pausedCount,
      exhaustedCount,
      title:
        activeRunCount === 1
          ? "1 Smart Treffen sucht gerade einen passenden Termin"
          : `${activeRunCount} Smart Treffen suchen gerade passende Termine`,
      description:
        "Der Bereich bleibt unterhalb deines Sozialkalenders, damit Planung sichtbar bleibt, aber nicht wie Discovery oder Hauptfeed wirkt.",
      nextStepTitle: "Lauf beobachten, dann auf Freigabe umschalten",
      nextStepDescription:
        "Solange Suche oder Zusagefenster laufen, bleibt Smart Treffen ein Orga-Statusboard. Erst bei Freigabe entscheidest du aktiv weiter.",
    };
  }

  if (securedCount > 0) {
    return {
      totalCount,
      awaitingApprovalCount,
      activeRunCount,
      securedCount,
      pausedCount,
      exhaustedCount,
      title:
        securedCount === 1
          ? "1 Smart Treffen ist bereits gesichert"
          : `${securedCount} Smart Treffen sind bereits gesichert`,
      description:
        "Gesicherte Gruppen-Termine bleiben hier als Planungsstand sichtbar. Spontane nächste Schritte prüfst du weiterhin in Jetzt oder Vorschläge.",
      nextStepTitle: "Gesicherte Gruppen-Termine im Blick behalten",
      nextStepDescription:
        "Hier verwaltest du den bestätigten Planungsstand. Für neue spontane Optionen wechselst du wieder zurück in Jetzt oder Vorschläge.",
    };
  }

  return {
    totalCount,
    awaitingApprovalCount,
    activeRunCount,
    securedCount,
    pausedCount,
    exhaustedCount,
    title: "Smart Treffen bleiben gesammelt im Planungsbereich",
    description:
      "Pausierte oder beendete Läufe bleiben hier als Verlauf deiner Gruppen-Orga sichtbar, ohne den offenen Aktivitätsfluss in Jetzt zu verdrängen.",
    nextStepTitle: "Verlauf prüfen oder einen neuen Lauf bewusst starten",
    nextStepDescription:
      "Geschlossene Läufe bleiben als Orga-Historie sichtbar. Starte nur dann neu, wenn die Gruppe wirklich einen frischen Suchlauf braucht.",
  };
}
