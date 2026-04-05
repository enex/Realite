"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { CalendarBlank, House, Sparkle, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

import { UserAvatar } from "@/src/components/user-avatar";
import {
  APP_SHELL_SECTIONS,
  getCurrentAppShellSection,
  isAppShellSectionActive,
} from "@/src/lib/app-shell-navigation";
import { getPageIntentMeta, type PageIntent } from "@/src/lib/page-hierarchy";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
};

type MobileNavItem = {
  href: string;
  /** Voller Name für Screenreader & Tooltips */
  label: string;
  /** Kurzlabel in der Tab-Leiste (schmale Viewports; iOS-ähnlich) */
  tabLabel: string;
  intent: string;
  Icon: PhosphorIcon;
};

const MOBILE_ITEMS: MobileNavItem[] = [
  { href: "/now", label: "Jetzt", tabLabel: "Jetzt", intent: "Entdecken", Icon: House },
  { href: "/suggestions", label: "Vorschläge", tabLabel: "Tipps", intent: "Reagieren", Icon: Sparkle },
  { href: "/events", label: "Events", tabLabel: "Events", intent: "Verwalten", Icon: CalendarBlank },
  { href: "/groups", label: "Gruppen", tabLabel: "Gruppen", intent: "Verwalten", Icon: Users },
];

function getIntentTone(intent: string): PageIntent {
  if (intent === "Entdecken") {
    return "discover";
  }

  if (intent === "Reagieren") {
    return "react";
  }

  return "manage";
}

function getSectionRailClassName(intent: string, active: boolean) {
  if (!active) {
    return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
  }

  if (intent === "Reagieren") {
    return "border-amber-200 bg-amber-50 text-amber-950 shadow-sm";
  }

  if (intent === "Verwalten") {
    return "border-slate-300 bg-slate-100 text-slate-950 shadow-sm";
  }

  return "border-teal-200 bg-teal-50 text-teal-950 shadow-sm";
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const currentSection = getCurrentAppShellSection(pathname);
  const showSectionContext =
    currentSection !== null && pathname !== currentSection.href;

  useEffect(() => {
    if (!user.email) return;

    posthog.identify(user.email, {
      email: user.email,
      name: user.name
    });
  }, [user.email, user.name]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/now" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900" title="Zur Übersicht">
            <img
              src="/icon.svg"
              alt=""
              className="h-6 w-6"
              aria-hidden="true"
            />
            <span>Realite</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
            {APP_SHELL_SECTIONS.map((item) => {
              const active = isAppShellSectionActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-teal-100 text-teal-900" : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 transition hover:border-teal-200 hover:bg-teal-50 sm:gap-2 sm:pr-3"
          >
            <UserAvatar name={user.name} email={user.email} image={user.image ?? null} size="sm" />
            <span className="hidden max-w-44 truncate text-sm font-medium text-slate-700 sm:block">
              Mein Profil
            </span>
          </Link>
        </div>
      </header>

      {currentSection && showSectionContext ? (
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={getPageIntentMeta(getIntentTone(currentSection.intent)).eyebrowClassName}>
                {currentSection.intent}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{currentSection.label}</span>
                <span className="hidden sm:inline">
                  {" · "}
                  {currentSection.description}
                </span>
              </p>
              <p className="mt-1 hidden text-sm font-medium text-slate-700 md:block">{currentSection.focus}</p>
            </div>
            <div className="hidden text-xs text-slate-500 md:block">
              <span className="font-semibold text-slate-700">Hier jetzt:</span> {currentSection.whenToUse}
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:block">Bereichswechsel</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-2 sm:mx-0 sm:px-0 md:pt-2">
              {APP_SHELL_SECTIONS.map((item) => {
                const active = isAppShellSectionActive(pathname, item.href);
                const intentMeta = getPageIntentMeta(getIntentTone(item.intent));

                return (
                  <a
                    key={`section-rail-${item.href}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`min-w-[7.25rem] shrink-0 rounded-2xl border px-3 py-2.5 transition sm:min-w-[9rem] md:min-w-0 md:flex-1 md:px-4 md:py-3 ${getSectionRailClassName(
                      item.intent,
                      active
                    )}`}
                  >
                    <span className={`hidden md:block ${intentMeta.eyebrowClassName}`}>{item.intent}</span>
                    <span className="block text-sm font-semibold md:mt-1">{item.label}</span>
                    <span className="mt-1 hidden text-xs font-medium leading-5 text-slate-700 md:block">{item.focus}</span>
                    <span className="mt-1 hidden text-xs leading-5 text-slate-500 md:block">{item.whenToUse}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-0">{children}</div>

      {/* Mobile: Vollbreite Tab-Leiste (iOS-nah: große Ziele, Blur, Haarlinie) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        aria-label="Mobile Navigation"
      >
        <div className="border-t border-slate-200/70 bg-white/75 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(15,23,42,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/68">
          <div className="mx-auto flex w-full max-w-6xl">
            {MOBILE_ITEMS.map((item) => {
              const active = isAppShellSectionActive(pathname, item.href);
              const Icon = item.Icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[50px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pb-1.5 pt-1.5 transition [-webkit-tap-highlight-color:transparent] active:opacity-70 ${
                    active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon
                    size={26}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                    className={`shrink-0 ${active ? "text-teal-600" : "text-slate-400"}`}
                  />
                  <span
                    className={`max-w-full px-0.5 text-center text-[13px] leading-[1.15] tracking-[-0.01em] ${
                      active ? "font-semibold text-teal-700" : "font-normal text-slate-500"
                    }`}
                  >
                    {item.tabLabel}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
