export const EVENT_VISIBILITY_VALUES = [
  "public",
  "group",
  "friends",
  "friends_of_friends",
  "smart_date",
] as const;

export const EVENT_CREATION_VISIBILITY_VALUES = [
  "public",
  "group",
  "friends",
  "friends_of_friends",
] as const;

export type EventVisibility = (typeof EVENT_VISIBILITY_VALUES)[number];
export type EventCreationVisibility =
  (typeof EVENT_CREATION_VISIBILITY_VALUES)[number];

export function resolveEventVisibility(input: {
  requestedVisibility: EventCreationVisibility;
  hasDateTag: boolean;
  isGlobalAlleEvent: boolean;
  targetsKontakteGroup: boolean;
}): EventVisibility {
  if (input.hasDateTag) {
    return "smart_date";
  }

  if (input.isGlobalAlleEvent) {
    return "public";
  }

  if (input.targetsKontakteGroup) {
    return "friends";
  }

  return input.requestedVisibility;
}

export function getEventVisibilityMeta(visibility: EventVisibility) {
  switch (visibility) {
    case "public":
      return {
        label: "Öffentlich",
        shortLabel: "Öffentlich",
        description: "Alle sichtbaren Nutzer in Realite können dieses Event sehen.",
      };
    case "group":
      return {
        label: "Nur Gruppe",
        shortLabel: "Gruppe",
        description: "Nur Mitglieder der ausgewählten Gruppe sehen dieses Event.",
      };
    case "friends":
      return {
        label: "Freunde",
        shortLabel: "Freunde",
        description: "Nur deine registrierten Kontakte sehen dieses Event.",
      };
    case "friends_of_friends":
      return {
        label: "Freunde von Freunden",
        shortLabel: "Freunde + 1",
        description:
          "Deine registrierten Kontakte und deren Kontakte können dieses Event sehen.",
      };
    case "smart_date":
      return {
        label: "Dating-Matches",
        shortLabel: "Dating",
        description:
          "Nur passende gegenseitige Matches sehen dieses Event im Dating-Kontext.",
      };
  }
}
