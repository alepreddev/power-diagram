import { create } from "zustand";
import {
  type AccentColorId,
  DEFAULT_ACCENT_COLOR,
  getAccentDefinition,
} from "@/config/themes";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accentColor: AccentColorId;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentColor: (accent: AccentColorId) => void;
}

const STORAGE_THEME_KEY = "power-diagram-theme";
const STORAGE_ACCENT_KEY = "power-diagram-accent";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

export function applyAccentToDOM(accent: AccentColorId, resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const def = getAccentDefinition(accent);
  const palette = resolved === "dark" ? def.dark : def.light;

  root.setAttribute("data-accent", accent);

  // Variables de color de acento de la app
  root.style.setProperty("--app-accent-main", palette.main);
  root.style.setProperty("--app-accent-hover", palette.hover);
  root.style.setProperty("--app-accent-active", palette.active);
  root.style.setProperty("--app-accent-contrast", palette.contrast);
  root.style.setProperty("--app-accent-text", palette.text);
  root.style.setProperty("--app-accent-subtle", palette.subtle);
  root.style.setProperty("--app-accent-subtle-hover", palette.subtleHover);
  root.style.setProperty("--app-accent-border", palette.border);
  root.style.setProperty("--app-accent-ring", palette.ring);

  // Sincronizar shadcn / tokens semánticos globales
  root.style.setProperty("--primary", palette.main);
  root.style.setProperty("--primary-foreground", palette.contrast);
  root.style.setProperty("--ring", palette.ring);
}

function applyThemeToDOM(resolved: ResolvedTheme, accent: AccentColorId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;

  // Re-aplicar el color de acento para adaptar colores sensibles como Monocromo (oscuro/blanco)
  applyAccentToDOM(accent, resolved);
}

// Inicializar preferencias almacenadas
const storedTheme = (typeof window !== "undefined"
  ? (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode) || "dark"
  : "dark") as ThemeMode;

const storedAccent = (typeof window !== "undefined"
  ? (localStorage.getItem(STORAGE_ACCENT_KEY) as AccentColorId) || DEFAULT_ACCENT_COLOR
  : DEFAULT_ACCENT_COLOR) as AccentColorId;

const initialResolved = resolveTheme(storedTheme);
applyThemeToDOM(initialResolved, storedAccent);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listener para cambios de tema en el sistema operativo
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (get().theme === "system") {
        const newResolved = getSystemTheme();
        applyThemeToDOM(newResolved, get().accentColor);
        set({ resolvedTheme: newResolved });
      }
    });
  }

  return {
    theme: storedTheme,
    resolvedTheme: initialResolved,
    accentColor: storedAccent,

    setTheme: (theme: ThemeMode) => {
      const resolved = resolveTheme(theme);
      localStorage.setItem(STORAGE_THEME_KEY, theme);
      applyThemeToDOM(resolved, get().accentColor);
      set({ theme, resolvedTheme: resolved });
    },

    toggleTheme: () => {
      const currentResolved = get().resolvedTheme;
      const nextTheme: ThemeMode = currentResolved === "dark" ? "light" : "dark";
      get().setTheme(nextTheme);
    },

    setAccentColor: (accent: AccentColorId) => {
      localStorage.setItem(STORAGE_ACCENT_KEY, accent);
      applyAccentToDOM(accent, get().resolvedTheme);
      set({ accentColor: accent });
    },
  };
});
