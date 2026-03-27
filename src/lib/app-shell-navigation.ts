export type AppSectionIntentLabel = "Entdecken" | "Reagieren" | "Verwalten";

export type AppShellSection = {
  href: string;
  label: string;
  intent: AppSectionIntentLabel;
  description: string;
};

export const APP_SHELL_SECTIONS: AppShellSection[] = [
  {
    href: "/now",
    label: "Jetzt",
    intent: "Entdecken",
    description: "offene Aktivitäten & spontane Optionen",
  },
  {
    href: "/suggestions",
    label: "Vorschläge",
    intent: "Reagieren",
    description: "offene Entscheidungen zuerst",
  },
  {
    href: "/events",
    label: "Events",
    intent: "Verwalten",
    description: "Sozialkalender, Zusagen, Planung & Gruppen-Orga",
  },
  {
    href: "/groups",
    label: "Gruppen",
    intent: "Verwalten",
    description: "Kontakte, Einladen & Sichtbarkeit",
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
    };
  }

  return null;
}
