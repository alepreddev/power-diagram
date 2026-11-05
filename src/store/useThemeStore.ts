import { create } from "zustand";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "power-diagram-theme";

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

function applyThemeToDOM(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;
}

// Inicializar la preferencia almacenada
const storedTheme = (typeof window !== "undefined"
  ? (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "dark"
  : "dark") as ThemeMode;

const initialResolved = resolveTheme(storedTheme);
applyThemeToDOM(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listener para cambios de tema en el sistema operativo
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (get().theme === "system") {
        const newResolved = getSystemTheme();
        applyThemeToDOM(newResolved);
        set({ resolvedTheme: newResolved });
      }
    });
  }

  return {
    theme: storedTheme,
    resolvedTheme: initialResolved,

    setTheme: (theme: ThemeMode) => {
      const resolved = resolveTheme(theme);
      localStorage.setItem(STORAGE_KEY, theme);
      applyThemeToDOM(resolved);
      set({ theme, resolvedTheme: resolved });
    },

    toggleTheme: () => {
      const currentResolved = get().resolvedTheme;
      const nextTheme: ThemeMode = currentResolved === "dark" ? "light" : "dark";
      get().setTheme(nextTheme);
    },
  };
});

