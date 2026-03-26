export const EVENT_PRESENCE_STATUS_VALUES = ["checked_in", "left"] as const;
export const EVENT_PRESENCE_CHECK_IN_LEAD_MINUTES = 90;

export type EventPresenceStatus = (typeof EVENT_PRESENCE_STATUS_VALUES)[number];
export type EventPresenceWindowState = "before_window" | "active" | "ended";

export function getEventPresenceWindow(input: {
  startsAt: Date;
  endsAt: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const opensAt = new Date(
    input.startsAt.getTime() - EVENT_PRESENCE_CHECK_IN_LEAD_MINUTES * 60_000,
  );
  const closesAt = input.endsAt;

  let state: EventPresenceWindowState = "active";
  if (now < opensAt) {
    state = "before_window";
  } else if (now > closesAt) {
    state = "ended";
  }

  return {
    state,
    opensAt,
    closesAt,
    canCheckIn: state === "active",
    showsPresence: state === "active",
  };
}

export function getEventPresenceWindowCopy(input: {
  startsAt: Date;
  endsAt: Date;
  now?: Date;
}) {
  const window = getEventPresenceWindow(input);

  if (window.state === "before_window") {
    return {
      label: "Vor-Ort-Sichtbarkeit startet später",
      description:
        "Du kannst dich erst kurz vor dem Event bewusst als vor Ort sichtbar markieren.",
      actionLabel: `Ab ${window.opensAt.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })} vor Ort sichtbar`,
    };
  }

  if (window.state === "ended") {
    return {
      label: "Vor-Ort-Sichtbarkeit ist beendet",
      description:
        "Mit dem Event endet auch der Vor-Ort-Status automatisch. Danach bleibt niemand weiter sichtbar.",
      actionLabel: "Event beendet",
    };
  }

  return {
    label: "Vor-Ort-Sichtbarkeit ist aktiv",
    description: `Check-ins sind ab ${window.opensAt.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })} bis zum Eventende möglich.`,
    actionLabel: "Jetzt vor Ort sichtbar sein",
  };
}

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
