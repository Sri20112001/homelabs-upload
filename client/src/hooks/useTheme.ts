import { useCallback, useEffect, useState } from "react";

export const THEME_FAMILIES = ["navy", "emerald", "amber", "violet"] as const;
export const THEME_MODES = ["dark", "light"] as const;

export type ThemeFamily = (typeof THEME_FAMILIES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_FAMILY: ThemeFamily = "navy";
export const DEFAULT_MODE: ThemeMode = "dark";

const STORAGE_FAMILY_KEY = "nodevault-theme-family";
const STORAGE_MODE_KEY = "nodevault-theme-mode";

function isThemeFamily(v: string | null): v is ThemeFamily {
  return (THEME_FAMILIES as readonly string[]).includes(v ?? "");
}

function isThemeMode(v: string | null): v is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(v ?? "");
}

export function getStoredFamily(): ThemeFamily {
  try {
    const v = localStorage.getItem(STORAGE_FAMILY_KEY);
    if (isThemeFamily(v)) return v;
  } catch {
    /* ignore storage access restrictions */
  }
  return DEFAULT_FAMILY;
}

export function getStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_MODE_KEY);
    if (isThemeMode(v)) return v;
  } catch {
    /* ignore storage access restrictions */
  }
  return DEFAULT_MODE;
}

export function applyTheme(family: ThemeFamily, mode: ThemeMode) {
  document.documentElement.dataset.theme = family;
  document.documentElement.dataset.mode = mode;

  try {
    localStorage.setItem(STORAGE_FAMILY_KEY, family);
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    /* ignore storage access restrictions */
  }
}

/** Hook providing unified access to family palette and dark/light mode */
export function useTheme() {
  const [family, setFamilyState] = useState<ThemeFamily>(() => getStoredFamily());
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode());

  useEffect(() => {
    applyTheme(family, mode);
  }, [family, mode]);

  const setFamily = useCallback((f: ThemeFamily) => setFamilyState(f), []);
  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    family,
    mode,
    setFamily,
    setMode,
    toggleMode,
    isDark: mode === "dark",
  };
}