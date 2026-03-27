export type AppSectionIntentLabel = "Entdecken" | "Reagieren" | "Verwalten";

export type AppShellSection = {
  href: string;
  label: string;
  intent: AppSectionIntentLabel;
  description: string;
  focus: string;
  whenToUse: string;
};

export const APP_SHELL_SECTIONS: AppShellSection[] = [
  {
    href: "/now",
    label: "Jetzt",
    intent: "Entdecken",
    description: "offene Aktivitäten & spontane Optionen",
    focus: "Spontan sehen, was gerade joinbar ist",
    whenToUse: "Für offene Aktivitäten, sichtbares Momentum und den schnellsten direkten Einstieg.",
  },
  {
    href: "/suggestions",
    label: "Vorschläge",
    intent: "Reagieren",
    description: "offene Entscheidungen zuerst",
    focus: "Offene Empfehlungen bewusst beantworten",
    whenToUse: "Für Zusagen, Absagen und frische Reaktionen statt für Planung oder Discovery.",
  },
  {
    href: "/events",
    label: "Events",
    intent: "Verwalten",
    description: "Sozialkalender, Zusagen, Planung & Gruppen-Orga",
    focus: "Zusagen, Planung und Sozialkalender ordnen",
    whenToUse: "Für bestätigte Aktivitäten, eigene Planung, Kalenderkontext und Smart Treffen.",
  },
  {
    href: "/groups",
    label: "Gruppen",
    intent: "Verwalten",
    description: "Kontakte, Einladen & Sichtbarkeit",
    focus: "Kreise, Einladungen und Sichtbarkeit pflegen",
    whenToUse: "Für Kontakte, Freigabekreise und die Vorbereitung, wer etwas sehen darf.",
  },
];

export function isAppShellSectionActive(pathname: string, href: string) {
  if (href.includes("#")) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getCurrentAppShellSection(pathname: string) {
  const currentSection = APP_SHELL_SECTIONS.find((item) => isAppShellSectionActive(pathname, item.href));

  if (currentSection) {
    return currentSection;
  }

  if (pathname.startsWith("/settings")) {
    return {
      href: "/settings",
      label: "Profil",
      intent: "Verwalten" as const,
      description: "Konto, Sichtbarkeit und Integrationen",
      focus: "Eigenen Zugriff und Freigaben steuern",
      whenToUse: "Für Konto, Integrationen, Dating-Freigabe und persönliche Sichtbarkeit.",
    };
  }

  return null;
}
