export const EVENT_PRESENCE_STATUS_VALUES = ["checked_in", "left"] as const;

export type EventPresenceStatus = (typeof EVENT_PRESENCE_STATUS_VALUES)[number];

export function getEventPresenceStatusMeta(status: EventPresenceStatus) {
  if (status === "checked_in") {
    return {
      label: "Vor Ort sichtbar",
      description:
        "Du bist für dieses Event aktuell bewusst als vor Ort sichtbar markiert.",
    };
  }

  return {
    label: "Nicht vor Ort sichtbar",
    description:
      "Du bist für dieses Event aktuell nicht als vor Ort sichtbar markiert.",
  };
}

export function getEventPresenceToggleCopy(hasCheckedIn: boolean) {
  if (hasCheckedIn) {
    return {
      title: "Du bist vor Ort sichtbar",
      description:
        "Andere Personen mit Event-Zugriff sehen, dass du gerade bewusst vor Ort sichtbar bist.",
      actionLabel: "Nicht mehr vor Ort sichtbar",
      successMessage: "Dein Vor-Ort-Status wurde ausgeblendet.",
    };
  }

  return {
    title: "Vor Ort sichtbar machen",
    description:
      "Teile nur für dieses Event explizit, dass du gerade vor Ort bist. Es passiert nichts automatisch.",
    actionLabel: "Jetzt vor Ort sichtbar sein",
    successMessage: "Du bist für dieses Event jetzt vor Ort sichtbar.",
  };
}
