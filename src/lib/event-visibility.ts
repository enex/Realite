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
export type EventVisibilityStage = "v1_5_core" | "v2_extension";

const EVENT_VISIBILITY_META: Record<
  EventVisibility,
  {
    label: string;
    shortLabel: string;
    description: string;
    stage: EventVisibilityStage;
    isCoreTier: boolean;
  }
> = {
  public: {
    label: "Öffentlich",
    shortLabel: "Öffentlich",
    description: "Alle sichtbaren Nutzer in Realite können dieses Event sehen.",
    stage: "v1_5_core",
    isCoreTier: true,
  },
  group: {
    label: "Nur Gruppe",
    shortLabel: "Gruppe",
    description: "Nur Mitglieder der ausgewählten Gruppe sehen dieses Event.",
    stage: "v1_5_core",
    isCoreTier: true,
  },
  friends: {
    label: "Freunde",
    shortLabel: "Freunde",
    description: "Nur deine registrierten Kontakte sehen dieses Event.",
    stage: "v1_5_core",
    isCoreTier: true,
  },
  friends_of_friends: {
    label: "Freunde von Freunden",
    shortLabel: "Freunde + 1",
    description:
      "Deine registrierten Kontakte und deren Kontakte können dieses Event sehen.",
    stage: "v1_5_core",
    isCoreTier: true,
  },
  smart_date: {
    label: "Dating-Matches",
    shortLabel: "Dating",
    description:
      "Nur passende gegenseitige Matches sehen dieses Event im Dating-Kontext.",
    stage: "v2_extension",
    isCoreTier: false,
  },
};

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
  return EVENT_VISIBILITY_META[visibility];
}

export function getEventVisibilityRoadmapSummary() {
  return {
    headline: "Realite hält das Kernmodell bewusst klein.",
    description:
      "Für normale Events reichen in V1.5 vier Freigaben: Gruppe, Freunde, Freunde von Freunden und Öffentlich. Geschützte Sonderfälle wie #date bleiben getrennte Zusatzlayer statt weiterer Standardstufen.",
  };
}
