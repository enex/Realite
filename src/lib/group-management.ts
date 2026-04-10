export type GroupManagementItem = {
  id: string;
  name: string;
  eventCount: number;
  contactCount: number;
  syncProvider: string | null;
  syncEnabled: boolean;
  visibility: "public" | "private";
};

export type GroupManagementState = {
  label: string;
  description: string;
  badgeClassName: string;
  cardClassName: string;
  rank: number;
};

export function getGroupManagementState(group: Pick<GroupManagementItem, "eventCount" | "contactCount">): GroupManagementState {
  if (group.eventCount > 0) {
    return {
      label: "Aktiv genutzt",
      description: "Hier laufen bereits sichtbare Aktivitäten oder bestätigte Planung.",
      badgeClassName: "bg-teal-100 text-teal-800",
      cardClassName:
        "border-teal-200 bg-teal-50/70 hover:border-teal-300 hover:bg-teal-50 dark:border-teal-500/35 dark:bg-teal-950/50 dark:hover:border-teal-500/55 dark:hover:bg-teal-950/65",
      rank: 0,
    };
  }

  if (group.contactCount > 0) {
    return {
      label: "Kreis steht",
      description: "Kontakte sind gepflegt. Jetzt fehlt vor allem konkrete Aktivität.",
      badgeClassName:
        "bg-sky-100 text-sky-900 dark:bg-sky-900/75 dark:text-sky-50 dark:ring-1 dark:ring-sky-500/35",
      cardClassName:
        "border-sky-200 bg-sky-50/70 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/50 dark:hover:border-sky-500/50 dark:hover:bg-sky-900/45",
      rank: 1,
    };
  }

  return {
    label: "Wartet auf Pflege",
    description: "Diese Gruppe ist angelegt, aber noch ohne Kontakte oder Events.",
    badgeClassName: "bg-amber-100 text-amber-800",
    cardClassName:
      "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/40 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/55",
    rank: 2,
  };
}

export function sortGroupsForManagement<T extends GroupManagementItem>(groups: T[]) {
  return [...groups].sort((left, right) => {
    const leftState = getGroupManagementState(left);
    const rightState = getGroupManagementState(right);

    if (leftState.rank !== rightState.rank) {
      return leftState.rank - rightState.rank;
    }

    if (left.eventCount !== right.eventCount) {
      return right.eventCount - left.eventCount;
    }

    if (left.contactCount !== right.contactCount) {
      return right.contactCount - left.contactCount;
    }

    return left.name.localeCompare(right.name, "de");
  });
}

export function getGroupManagementFocus(groups: GroupManagementItem[], hiddenGroupCount: number) {
  const emptyGroupCount = groups.filter((group) => group.contactCount === 0 && group.eventCount === 0).length;
  const activeGroupCount = groups.filter((group) => group.eventCount > 0).length;

  if (groups.length === 0 && hiddenGroupCount > 0) {
    return {
      title: "Zuerst versteckte Sync-Kreise prüfen",
      description: "Aktuell ist kein sichtbarer Kreis aktiv. Prüfe ausgeblendete Sync-Gruppen oder lege bewusst eine neue Gruppe an.",
    };
  }

  if (groups.length === 0) {
    return {
      title: "Ersten relevanten Kreis anlegen",
      description: "Noch ist kein sozialer Rahmen sichtbar gepflegt. Starte mit einer kleinen Gruppe, bevor du die Sichtbarkeit breiter öffnest.",
    };
  }

  if (emptyGroupCount > 0) {
    return {
      title: "Leere Gruppen zuerst nachziehen",
      description: "Mindestens ein Kreis wartet noch auf Kontakte oder Aktivität. Räume diese Lücken auf, bevor du neue Gruppen anlegst.",
    };
  }

  if (hiddenGroupCount > 0) {
    return {
      title: "Sync-Abdeckung im Blick behalten",
      description: "Deine sichtbaren Kreise sind gepflegt. Prüfe als Nächstes, ob versteckte Sync-Gruppen wieder relevant geworden sind.",
    };
  }

  if (activeGroupCount > 0) {
    return {
      title: "Aktive Kreise gezielt pflegen",
      description: "Deine Gruppen tragen bereits Planung. Nutze sie sparsam weiter und halte Sichtbarkeit und Kontakte bewusst schlank.",
    };
  }

  return {
    title: "Kreise in Aktivität übersetzen",
    description: "Die Kontakte stehen, aber noch kein Kreis trägt Planung. Von hier aus ist ein erstes Event oder Smart Treffen der nächste sinnvolle Schritt.",
  };
}
