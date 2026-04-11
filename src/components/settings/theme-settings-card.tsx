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
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Darstellung
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Erscheinungsbild</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="h-24 animate-pulse rounded-xl border border-border bg-muted dark:border-white/10 dark:bg-muted/50"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Darstellung</p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">Erscheinungsbild</h2>
      <p className="mt-2 text-sm text-muted-foreground">
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
                  : "border-border bg-card hover:border-input hover:bg-muted dark:border-white/12 dark:bg-[var(--app-background)] dark:hover:border-white/20 dark:hover:bg-card/5"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isActive
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "bg-muted text-muted-foreground group-hover:bg-muted group-hover:text-foreground dark:bg-card/8 dark:group-hover:bg-card/12"
                }`}
              >
                <Icon size={22} weight={isActive ? "fill" : "regular"} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isActive ? "text-teal-900" : "text-foreground"}`}>
                  {option.label}
                </p>
                <p className={`mt-0.5 text-[11px] leading-tight ${isActive ? "text-teal-700" : "text-muted-foreground"}`}>
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
        <p className="mt-3 text-xs text-muted-foreground">
          Dein Gerät nutzt gerade den {resolvedTheme === "dark" ? "dunklen" : "hellen"} Modus.
        </p>
      ) : null}
    </section>
  );
}
