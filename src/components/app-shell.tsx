"use client";

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
import { eyebrowBaseClassName, getPageIntentMeta, type PageIntent } from "@/src/lib/page-hierarchy";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
};

const MOBILE_ITEMS = [
  { href: "/now", label: "Jetzt", intent: "Entdecken", Icon: House },
  { href: "/suggestions", label: "Vorschläge", intent: "Reagieren", Icon: Sparkle },
  { href: "/events", label: "Events", intent: "Verwalten", Icon: CalendarBlank },
  { href: "/groups", label: "Gruppen", intent: "Verwalten", Icon: Users },
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
            <span className="hidden text-sm font-normal text-slate-500 sm:inline">– Erlebnisse & Menschen</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
            {APP_SHELL_SECTIONS.map((item) => {
              const active = isAppShellSectionActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 transition ${active ? "bg-teal-100 text-teal-900" : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  <span className={`block ${eyebrowBaseClassName} ${active ? "text-teal-700" : "text-slate-400"}`}>
                    {item.intent}
                  </span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                </a>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white pr-2.5 transition hover:border-teal-200 hover:bg-teal-50"
          >
            <UserAvatar name={user.name} email={user.email} image={user.image ?? null} size="sm" className="-m-px" />
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
                {" · "}
                {currentSection.description}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">{currentSection.focus}</p>
            </div>
            <div className="hidden text-xs text-slate-500 md:block">
              <span className="font-semibold text-slate-700">Hier jetzt:</span> {currentSection.whenToUse}
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bereichswechsel</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-2 sm:mx-0 sm:px-0">
              {APP_SHELL_SECTIONS.map((item) => {
                const active = isAppShellSectionActive(pathname, item.href);
                const intentMeta = getPageIntentMeta(getIntentTone(item.intent));

                return (
                  <a
                    key={`section-rail-${item.href}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`min-w-[13rem] flex-1 rounded-2xl border px-4 py-3 transition md:min-w-0 ${getSectionRailClassName(
                      item.intent,
                      active
                    )}`}
                  >
                    <span className={`block ${intentMeta.eyebrowClassName}`}>{item.intent}</span>
                    <span className="mt-1 block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-700">{item.focus}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.whenToUse}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">{children}</div>

      {/* Mobile: floating bubble nav, Profil nur oben */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:hidden"
        aria-label="Mobile Navigation"
      >
        <div className="flex rounded-full border border-slate-200/80 bg-white/90 px-1 py-1 shadow-lg shadow-slate-200/50 backdrop-blur-xl">
          {MOBILE_ITEMS.map((item) => {
            const active = isAppShellSectionActive(pathname, item.href);
            const Icon = item.Icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-full px-4 py-2.5 transition sm:px-5 ${active ? "bg-teal-100 text-teal-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
                aria-current={active ? "page" : undefined}
                title={item.label}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.12em] sm:block">{item.intent}</span>
                <span className="hidden text-[10px] font-medium sm:block">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
