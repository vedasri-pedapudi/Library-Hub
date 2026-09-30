import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_KEY = "pagenest:theme";

/**
 * Runs in <head> before first paint so the saved theme applies without a flash.
 * Kept as a string because it executes before React loads.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var c=document.documentElement.classList;c.remove("light","dark");c.add(t);}catch(e){}})();`;

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(theme: ResolvedTheme) {
  const cl = document.documentElement.classList;
  cl.remove("light", "dark");
  cl.add(theme);
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ preference: "system", resolved: "dark", setPreference: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    let saved: ThemePreference = "system";
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark" || v === "system") saved = v;
    } catch { /* storage blocked */ }
    setPref(saved);
    // Enable color transitions only after the initial theme is in place.
    requestAnimationFrame(() => document.documentElement.classList.add("theme-ready"));
  }, []);

  useEffect(() => {
    const next = preference === "system" ? systemTheme() : preference;
    setResolved(next);
    apply(next);
    if (preference !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { const t = systemTheme(); setResolved(t); apply(t); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    try { localStorage.setItem(THEME_KEY, p); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
