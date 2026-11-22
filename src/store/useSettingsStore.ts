import { create } from "zustand";
import { type AppLanguage, TRANSLATIONS } from "@/i18n/translations";

const STORAGE_AUTOSAVE_KEY = "power-diagram-autosave";
const STORAGE_LANGUAGE_KEY = "power-diagram-language";

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

function applyLanguageToDOM(lang: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}

const initialLanguage = readStoredLanguage();
applyLanguageToDOM(initialLanguage);

interface SettingsState {
  autoSave: boolean;
  language: AppLanguage;
  setAutoSave: (enabled: boolean) => void;
  toggleAutoSave: () => void;
  setLanguage: (language: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoSave: readStoredAutoSave(),
  language: initialLanguage,

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
