"use client";

import { CalendarBlank, Sparkle, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

import { UserAvatar } from "@/src/components/user-avatar";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
};

const DESKTOP_ITEMS = [
  { href: "/events", label: "Events" },
  { href: "/groups", label: "Gruppen & Einladen" },
  { href: "/suggestions", label: "Vorschläge" },
];

const MOBILE_ITEMS = [
  { href: "/events", label: "Events", Icon: CalendarBlank },
  { href: "/groups", label: "Gruppen", Icon: Users },
  { href: "/suggestions", label: "Vorschläge", Icon: Sparkle },
];

function isItemActive(pathname: string, href: string) {
  if (href.includes("#")) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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
          <a href="/events" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900" title="Zur Übersicht">
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
            {DESKTOP_ITEMS.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-teal-100 text-teal-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {item.label}
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

      <div className="pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">{children}</div>

      {/* Mobile: iOS 26-style floating bubble nav (3 Tabs, Profil nur oben) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:hidden"
        aria-label="Mobile Navigation"
      >
        <div className="flex rounded-full border border-slate-200/80 bg-white/90 px-1 py-1 shadow-lg shadow-slate-200/50 backdrop-blur-xl">
          {MOBILE_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href);
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
                <span className="mt-0.5 hidden text-[10px] font-medium sm:block">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
