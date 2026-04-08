"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeOption = {
  value: string;
  label: string;
  description: string;
  Icon: typeof Sun;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    description: "Folgt deinem Betriebssystem",
    Icon: Monitor,
  },
  {
    value: "light",
    label: "Hell",
    description: "Immer heller Modus",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dunkel",
    description: "Immer dunkler Modus",
    Icon: Moon,
  },
];

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Darstellung</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Erscheinungsbild</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800/50"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Darstellung</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Erscheinungsbild</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Wähle, ob Realite im hellen oder dunklen Modus angezeigt wird, oder folge der Einstellung deines Geräts.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.value;
          const Icon = option.Icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all ${
                isActive
                  ? "border-teal-500 bg-teal-50 shadow-sm dark:border-teal-500/80 dark:bg-teal-950/50 dark:shadow-[0_0_0_1px_rgba(90,175,150,0.2)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/12 dark:bg-[var(--app-background)] dark:hover:border-white/20 dark:hover:bg-white/5"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isActive
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-white/8 dark:text-slate-400 dark:group-hover:bg-white/12 dark:group-hover:text-slate-200"
                }`}
              >
                <Icon size={22} weight={isActive ? "fill" : "regular"} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isActive ? "text-teal-900 dark:text-teal-100" : "text-slate-700 dark:text-slate-300"}`}>
                  {option.label}
                </p>
                <p className={`mt-0.5 text-[11px] leading-tight ${isActive ? "text-teal-700 dark:text-teal-300/90" : "text-slate-500 dark:text-slate-500"}`}>
                  {option.description}
                </p>
              </div>
              {isActive ? (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-white dark:bg-teal-500">
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {theme === "system" ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Dein Gerät nutzt gerade den {resolvedTheme === "dark" ? "dunklen" : "hellen"} Modus.
        </p>
      ) : null}
    </section>
  );
}
