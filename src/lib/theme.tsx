"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: string) => void;
};

const THEME_STORAGE_KEY = "theme";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeTheme(value: string | null | undefined): Theme {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia(SYSTEM_DARK_QUERY).matches
  ) {
    return "dark";
  }
  return "light";
}

function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function RealiteThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    setThemeState(normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY)));
    setSystemTheme(getSystemTheme());

    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: string) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeState(normalized);
    window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useRealiteTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      theme: "system" as const,
      resolvedTheme: "light" as const,
      setTheme: () => {},
    };
  }
  return value;
}
