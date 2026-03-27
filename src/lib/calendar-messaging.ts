export function getEventsViewMessaging(calendarConnected: boolean) {
  if (calendarConnected) {
    return {
      heroLead: "Das ist deine persönliche Kalender- und Sozialkalender-Ansicht: planen, verwalten, zusagen und teilen.",
      sectionTitle: "Events als Sozialkalender",
      sectionDescription:
        "Hier trennst du bestätigte Aktivitäten, eigene Planung und übrigen Kalenderkontext sauber voneinander.",
      emptyTitle: "Dein Sozialkalender ist noch leer.",
      emptyDescription:
        "In Events sammelst du bestätigte Aktivitäten, eigene Planung und sichtbaren Kalenderkontext. Wenn hier noch nichts auftaucht, hilft dir die nächste Aktion je nach Ziel: entdecken, reagieren, Kreise pflegen oder selbst starten.",
    };
  }

  return {
    heroLead: "Das ist deine Planungs- und Zusagenansicht: auch ohne verbundenen Kalender kannst du hier Aktivitäten anlegen, teilen und verwalten.",
    sectionTitle: "Events für Planung und Zusagen",
    sectionDescription:
      "Hier trennst du bestätigte Aktivitäten, eigene Planung und späteren optionalen Kalenderkontext sauber voneinander.",
    emptyTitle: "Deine Event-Ansicht ist noch leer.",
    emptyDescription:
      "Auch ohne Kalenderzugriff kannst du in Events eigene Aktivitäten planen, Zusagen verwalten und sichtbar teilen. Wenn hier noch nichts auftaucht, hilft dir die nächste Aktion je nach Ziel: entdecken, reagieren, Kreise pflegen oder direkt selbst starten.",
  };
}

export function getSuggestionSettingsMessaging(calendarConnected: boolean) {
  if (calendarConnected) {
    return {
      lead: "Steuere hier Vorschlagslogik, manuelle Planung und deinen optionalen Kalenderkontext.",
      supportTitle: "Kalenderzugriff aktiv",
      supportBody:
        "Realite bleibt auch ohne Kalender nutzbar. Mit verbundenem Kalender kommen automatische Vormerkungen, Verfügbarkeitsabgleich und zusätzlicher Planungskontext dazu.",
      warning: null,
      autoInsertDescription: "Aktuell automatisch als Vorschlag in deinem Kalender vorgemerkt",
      disabledHint: null,
    };
  }

  return {
    lead: "Steuere hier Vorschlagslogik und manuelle Planung. Kalenderkontext kannst du später optional ergänzen.",
    supportTitle: "Ohne Kalender weiter nutzbar",
    supportBody:
      "Events, Gruppen und Vorschläge funktionieren weiter auch ohne verbundenen Kalender. Sobald du später Kalenderzugriff freigibst, ergänzt Realite automatische Vormerkungen und Verfügbarkeitsabgleich.",
    warning: "Aktuell ist kein Kalenderzugriff aktiv. Planung, Gruppen und Vorschläge laufen weiter manuell.",
    autoInsertDescription: "Automatische Kalender-Vormerkungen werden aktiv, sobald du später Kalenderzugriff freigibst",
    disabledHint:
      "Diese Kalender-Optionen werden aktiv, sobald du später einen Kalender verbindest. Deine übrigen Realite-Flows bleiben davon unberührt.",
  };
}
