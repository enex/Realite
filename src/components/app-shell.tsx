"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/groups", label: "Gruppen" },
  { href: "/suggestions", label: "Vorschläge" },
  { href: "/docs", label: "Docs" }
];

const MOBILE_ITEMS = [
  { href: "/events", label: "Events" },
  { href: "/groups", label: "Gruppen" },
  { href: "/suggestions", label: "Vorschläge" },
  { href: "/settings", label: "Profil" }
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/events" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <img
              src="/icon.svg"
              alt=""
              className="h-6 w-6 rounded-md border border-slate-200 bg-white p-0.5"
              aria-hidden="true"
            />
            <span>Realite</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
            {DESKTOP_ITEMS.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-teal-100 text-teal-800" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 transition hover:border-teal-200 hover:bg-teal-50"
          >
            <UserAvatar name={user.name} email={user.email} image={user.image ?? null} size="sm" />
            <span className="hidden max-w-[11rem] truncate text-sm font-medium text-slate-700 sm:block">
              Mein Profil
            </span>
          </Link>
        </div>
      </header>

      <div className="pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0">{children}</div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden"
        aria-label="Mobile Navigation"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1">
          {MOBILE_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-md px-2 py-2 text-center text-xs font-semibold ${
                  active ? "bg-teal-100 text-teal-800" : "text-slate-700"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
