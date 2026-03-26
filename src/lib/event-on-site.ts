export function getEventOnSiteVisibilityMeta(enabled: boolean) {
  if (enabled) {
    return {
      label: "Vor Ort sichtbar möglich",
      shortLabel: "Vor Ort sichtbar",
      description:
        "Für dieses Event ist freiwillige Vor-Ort-Sichtbarkeit erlaubt. Nichts wird automatisch geteilt.",
    };
  }

  return {
    label: "Vor Ort sichtbar aus",
    shortLabel: "Vor Ort aus",
    description:
      "Für dieses Event bleibt Vor-Ort-Sichtbarkeit deaktiviert, bis du sie bewusst erlaubst.",
  };
}
