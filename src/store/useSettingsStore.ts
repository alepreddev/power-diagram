import { create } from "zustand";
import { type AppLanguage, TRANSLATIONS } from "@/i18n/translations";
import type { LayoutDirection, LayoutSpacing } from "@/lib/autoLayout";

const STORAGE_AUTOSAVE_KEY = "power-diagram-autosave";
const STORAGE_LANGUAGE_KEY = "power-diagram-language";
const STORAGE_SNAP_GRID_KEY = "power-diagram-snap-to-grid";
const STORAGE_LAYOUT_DIRECTION_KEY = "power-diagram-layout-direction";
const STORAGE_LAYOUT_SPACING_KEY = "power-diagram-layout-spacing";

function readStoredAutoSave(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_AUTOSAVE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
  } catch {
    // ignore storage errors
  }
  return true;
}

function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "es";
  try {
    const raw = localStorage.getItem(STORAGE_LANGUAGE_KEY);
    if (raw === "en" || raw === "es") {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return "es";
}

function readStoredSnapToGrid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_SNAP_GRID_KEY) === "true";
  } catch {
    return false;
  }
}

function readStoredLayoutDirection(): LayoutDirection {
  if (typeof window === "undefined") return "RIGHT";
  try {
    const raw = localStorage.getItem(STORAGE_LAYOUT_DIRECTION_KEY);
    if (raw === "RIGHT" || raw === "DOWN") return raw;
  } catch {
    // ignore
  }
  return "RIGHT";
}

function readStoredLayoutSpacing(): LayoutSpacing {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = localStorage.getItem(STORAGE_LAYOUT_SPACING_KEY);
    if (raw === "compact" || raw === "normal" || raw === "spacious") return raw;
  } catch {
    // ignore
  }
  return "normal";
}

function applyLanguageToDOM(lang: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}

const initialLanguage = readStoredLanguage();
applyLanguageToDOM(initialLanguage);

interface SettingsState {
  autoSave: boolean;
  language: AppLanguage;
  snapToGrid: boolean;
  layoutDirection: LayoutDirection;
  layoutSpacing: LayoutSpacing;
  setAutoSave: (enabled: boolean) => void;
  toggleAutoSave: () => void;
  setLanguage: (language: AppLanguage) => void;
  setSnapToGrid: (enabled: boolean) => void;
  toggleSnapToGrid: () => void;
  setLayoutDirection: (direction: LayoutDirection) => void;
  setLayoutSpacing: (spacing: LayoutSpacing) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoSave: readStoredAutoSave(),
  language: initialLanguage,
  snapToGrid: readStoredSnapToGrid(),
  layoutDirection: readStoredLayoutDirection(),
  layoutSpacing: readStoredLayoutSpacing(),

  setAutoSave: (enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_AUTOSAVE_KEY, String(enabled));
    } catch {
      // ignore storage errors
    }
    set({ autoSave: enabled });
  },

  toggleAutoSave: () => {
    get().setAutoSave(!get().autoSave);
  },

  setLanguage: (language: AppLanguage) => {
    try {
      localStorage.setItem(STORAGE_LANGUAGE_KEY, language);
    } catch {
      // ignore storage errors
    }
    applyLanguageToDOM(language);
    set({ language });
  },

  setSnapToGrid: (enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_SNAP_GRID_KEY, String(enabled));
    } catch {
      // ignore storage errors
    }
    set({ snapToGrid: enabled });
  },

  toggleSnapToGrid: () => {
    get().setSnapToGrid(!get().snapToGrid);
  },

  setLayoutDirection: (direction: LayoutDirection) => {
    try {
      localStorage.setItem(STORAGE_LAYOUT_DIRECTION_KEY, direction);
    } catch {
      // ignore storage errors
    }
    set({ layoutDirection: direction });
  },

  setLayoutSpacing: (spacing: LayoutSpacing) => {
    try {
      localStorage.setItem(STORAGE_LAYOUT_SPACING_KEY, spacing);
    } catch {
      // ignore storage errors
    }
    set({ layoutSpacing: spacing });
  },
}));

/** Hook de acceso rápido a las traducciones activas y al selector de idioma. */
export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return {
    t: TRANSLATIONS[language],
    language,
    setLanguage,
  };
}
