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
  isAppShellSectionActive,
} from "@/src/lib/app-shell-navigation";

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

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

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
