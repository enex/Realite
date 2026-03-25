export const EVENT_JOIN_MODE_VALUES = ["direct", "request", "interest"] as const;

export type EventJoinMode = (typeof EVENT_JOIN_MODE_VALUES)[number];

export function getEventJoinModeMeta(mode: EventJoinMode) {
  switch (mode) {
    case "request":
      return {
        label: "Anfrage senden",
        shortLabel: "Anfrage nötig",
        description: "Teilnahme läuft erst nach deiner Freigabe oder einer bewussten Bestätigung.",
      };
    case "interest":
      return {
        label: "Interesse zeigen",
        shortLabel: "Interesse zuerst",
        description: "Andere geben zuerst unverbindlich Interesse an, bevor daraus eine Zusage wird.",
      };
    case "direct":
    default:
      return {
        label: "Direkt beitreten",
        shortLabel: "Direkt beitreten",
        description: "Sichtbare Personen können direkt zusagen, ohne vorherige Freigabe.",
      };
  }
}
