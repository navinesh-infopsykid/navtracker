"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { toDateInput } from "@/lib/dates";
import type { SettingsDTO } from "@/lib/types";

interface Ctx {
  settings: SettingsDTO | null;
  setSettings: (s: SettingsDTO) => void;
  resolvedTheme: "light" | "dark";
  setThemeQuick: (t: "light" | "dark") => void;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<Ctx | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

function applyTheme(theme: string, accent: string): "light" | "dark" {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.accent = accent;
  try {
    localStorage.setItem("nav-theme", theme);
    localStorage.setItem("nav-accent", accent);
  } catch {}
  return dark ? "dark" : "light";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<SettingsDTO | null>(null);
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  const setSettings = useCallback((s: SettingsDTO) => {
    setSettingsState(s);
    setResolved(applyTheme(s.theme, s.accent));
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api<SettingsDTO>("/api/settings"));
    } catch {
      // keep the UI usable even if settings can't load; pages show their own errors
    }
  }, [setSettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Follow OS changes when theme = system
  useEffect(() => {
    if (settings?.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setResolved(applyTheme("system", settings.accent));
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [settings?.theme, settings?.accent]);

  /** Header toggle: switches instantly and saves to the database. */
  const setThemeQuick = useCallback(
    (t: "light" | "dark") => {
      if (!settings) return;
      const next = { ...settings, theme: t };
      setSettings(next);
      const { name, dailyLimitMinutes, streakMinMinutes, dailyDsaTarget, planWeeks, mainGoal, accent } = next;
      const working = new Set(next.workingDays.split(",").filter(Boolean).map(Number));
      const parsed = next.dayTargets.split(",").filter(Boolean).map(Number);
      const dayTargets = parsed.length === 7 ? parsed : [0, 1, 2, 3, 4, 5, 6].map((d) => (working.has(d) ? next.dailyTargetMinutes : 0));
      api("/api/settings", {
        method: "PUT",
        body: {
          name, dailyLimitMinutes, streakMinMinutes, dailyDsaTarget, planWeeks, mainGoal, accent,
          theme: t,
          dayTargets,
          planStartDate: toDateInput(next.planStartDate),
        },
      }).catch(() => {});
    },
    [settings, setSettings],
  );

  return (
    <SettingsContext.Provider value={{ settings, setSettings, resolvedTheme, setThemeQuick, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
