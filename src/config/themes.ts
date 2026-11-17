/**
 * Definición de colores de énfasis (Accent Colors) y configuración de temas para Power Diagram.
 */

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export type AccentColorId =
  | "indigo"
  | "blue"
  | "emerald"
  | "cyan"
  | "violet"
  | "rose"
  | "amber"
  | "teal"
  | "monochrome";

export interface AccentColorDefinition {
  id: AccentColorId;
  label: string;
  description: string;
  swatchHex: string; // Color representativo para la paleta UI
  isMonochrome?: boolean;
  light: {
    main: string;
    hover: string;
    active: string;
    contrast: string;
    text: string;
    subtle: string;
    subtleHover: string;
    border: string;
    ring: string;
  };
  dark: {
    main: string;
    hover: string;
    active: string;
    contrast: string;
    text: string;
    subtle: string;
    subtleHover: string;
    border: string;
    ring: string;
  };
}

export const ACCENT_COLORS: readonly AccentColorDefinition[] = [
  {
    id: "indigo",
    label: "Índigo",
    description: "Púrpura azulado clásico predeterminado",
    swatchHex: "#6366f1",
    light: {
      main: "#4f46e5",
      hover: "#4338ca",
      active: "#3730a3",
      contrast: "#ffffff",
      text: "#4f46e5",
      subtle: "rgba(99, 102, 241, 0.10)",
      subtleHover: "rgba(99, 102, 241, 0.18)",
      border: "rgba(99, 102, 241, 0.35)",
      ring: "rgba(99, 102, 241, 0.40)",
    },
    dark: {
      main: "#6366f1",
      hover: "#818cf8",
      active: "#4f46e5",
      contrast: "#ffffff",
      text: "#818cf8",
      subtle: "rgba(99, 102, 241, 0.18)",
      subtleHover: "rgba(99, 102, 241, 0.28)",
      border: "rgba(99, 102, 241, 0.35)",
      ring: "rgba(99, 102, 241, 0.40)",
    },
  },
  {
    id: "blue",
    label: "Azul Océano",
    description: "Azul nítido y profesional",
    swatchHex: "#3b82f6",
    light: {
      main: "#2563eb",
      hover: "#1d4ed8",
      active: "#1e40af",
      contrast: "#ffffff",
      text: "#2563eb",
      subtle: "rgba(59, 130, 246, 0.10)",
      subtleHover: "rgba(59, 130, 246, 0.18)",
      border: "rgba(59, 130, 246, 0.35)",
      ring: "rgba(59, 130, 246, 0.40)",
    },
    dark: {
      main: "#3b82f6",
      hover: "#60a5fa",
      active: "#2563eb",
      contrast: "#ffffff",
      text: "#60a5fa",
      subtle: "rgba(59, 130, 246, 0.18)",
      subtleHover: "rgba(59, 130, 246, 0.28)",
      border: "rgba(59, 130, 246, 0.35)",
      ring: "rgba(59, 130, 246, 0.40)",
    },
  },
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Verde fresco y equilibrado",
    swatchHex: "#10b981",
    light: {
      main: "#059669",
      hover: "#047857",
      active: "#065f46",
      contrast: "#ffffff",
      text: "#059669",
      subtle: "rgba(16, 185, 129, 0.10)",
      subtleHover: "rgba(16, 185, 129, 0.18)",
      border: "rgba(16, 185, 129, 0.35)",
      ring: "rgba(16, 185, 129, 0.40)",
    },
    dark: {
      main: "#10b981",
      hover: "#34d399",
      active: "#059669",
      contrast: "#ffffff",
      text: "#34d399",
      subtle: "rgba(16, 185, 129, 0.18)",
      subtleHover: "rgba(16, 185, 129, 0.28)",
      border: "rgba(16, 185, 129, 0.35)",
      ring: "rgba(16, 185, 129, 0.40)",
    },
  },
  {
    id: "cyan",
    label: "Cian",
    description: "Turquesa eléctrico y moderno",
    swatchHex: "#06b6d4",
    light: {
      main: "#0891b2",
      hover: "#0e7490",
      active: "#155e75",
      contrast: "#ffffff",
      text: "#0891b2",
      subtle: "rgba(6, 182, 212, 0.10)",
      subtleHover: "rgba(6, 182, 212, 0.18)",
      border: "rgba(6, 182, 212, 0.35)",
      ring: "rgba(6, 182, 212, 0.40)",
    },
    dark: {
      main: "#06b6d4",
      hover: "#22d3ee",
      active: "#0891b2",
      contrast: "#ffffff",
      text: "#22d3ee",
      subtle: "rgba(6, 182, 212, 0.18)",
      subtleHover: "rgba(6, 182, 212, 0.28)",
      border: "rgba(6, 182, 212, 0.35)",
      ring: "rgba(6, 182, 212, 0.40)",
    },
  },
  {
    id: "violet",
    label: "Violeta",
    description: "Púrpura profundo y vibrante",
    swatchHex: "#8b5cf6",
    light: {
      main: "#7c3aed",
      hover: "#6d28d9",
      active: "#5b21b6",
      contrast: "#ffffff",
      text: "#7c3aed",
      subtle: "rgba(139, 92, 246, 0.10)",
      subtleHover: "rgba(139, 92, 246, 0.18)",
      border: "rgba(139, 92, 246, 0.35)",
      ring: "rgba(139, 92, 246, 0.40)",
    },
    dark: {
      main: "#8b5cf6",
      hover: "#a78bfa",
      active: "#7c3aed",
      contrast: "#ffffff",
      text: "#a78bfa",
      subtle: "rgba(139, 92, 246, 0.18)",
      subtleHover: "rgba(139, 92, 246, 0.28)",
      border: "rgba(139, 92, 246, 0.35)",
      ring: "rgba(139, 92, 246, 0.40)",
    },
  },
  {
    id: "rose",
    label: "Rosa",
    description: "Carmesí llamativo y enérgico",
    swatchHex: "#f43f5e",
    light: {
      main: "#e11d48",
      hover: "#be123c",
      active: "#9f1239",
      contrast: "#ffffff",
      text: "#e11d48",
      subtle: "rgba(244, 63, 94, 0.10)",
      subtleHover: "rgba(244, 63, 94, 0.18)",
      border: "rgba(244, 63, 94, 0.35)",
      ring: "rgba(244, 63, 94, 0.40)",
    },
    dark: {
      main: "#f43f5e",
      hover: "#fb7185",
      active: "#e11d48",
      contrast: "#ffffff",
      text: "#fb7185",
      subtle: "rgba(244, 63, 94, 0.18)",
      subtleHover: "rgba(244, 63, 94, 0.28)",
      border: "rgba(244, 63, 94, 0.35)",
      ring: "rgba(244, 63, 94, 0.40)",
    },
  },
  {
    id: "amber",
    label: "Ámbar",
    description: "Naranja cálido y dorado",
    swatchHex: "#f59e0b",
    light: {
      main: "#d97706",
      hover: "#b45309",
      active: "#92400e",
      contrast: "#ffffff",
      text: "#d97706",
      subtle: "rgba(245, 158, 11, 0.10)",
      subtleHover: "rgba(245, 158, 11, 0.18)",
      border: "rgba(245, 158, 11, 0.35)",
      ring: "rgba(245, 158, 11, 0.40)",
    },
    dark: {
      main: "#f59e0b",
      hover: "#fbbf24",
      active: "#d97706",
      contrast: "#ffffff",
      text: "#fbbf24",
      subtle: "rgba(245, 158, 11, 0.18)",
      subtleHover: "rgba(245, 158, 11, 0.28)",
      border: "rgba(245, 158, 11, 0.35)",
      ring: "rgba(245, 158, 11, 0.40)",
    },
  },
  {
    id: "teal",
    label: "Teal",
    description: "Verde azulado equilibrado",
    swatchHex: "#14b8a6",
    light: {
      main: "#0d9488",
      hover: "#0f766e",
      active: "#115e59",
      contrast: "#ffffff",
      text: "#0d9488",
      subtle: "rgba(20, 184, 166, 0.10)",
      subtleHover: "rgba(20, 184, 166, 0.18)",
      border: "rgba(20, 184, 166, 0.35)",
      ring: "rgba(20, 184, 166, 0.40)",
    },
    dark: {
      main: "#14b8a6",
      hover: "#2dd4bf",
      active: "#0d9488",
      contrast: "#ffffff",
      text: "#2dd4bf",
      subtle: "rgba(20, 184, 166, 0.18)",
      subtleHover: "rgba(20, 184, 166, 0.28)",
      border: "rgba(20, 184, 166, 0.35)",
      ring: "rgba(20, 184, 166, 0.40)",
    },
  },
  {
    id: "monochrome",
    label: "Monocromo",
    description: "Oscuro en modo claro / Blanco en modo oscuro",
    swatchHex: "#18181b",
    isMonochrome: true,
    light: {
      main: "#18181b", // Zinc 900
      hover: "#27272a", // Zinc 800
      active: "#09090b", // Zinc 950
      contrast: "#ffffff",
      text: "#18181b",
      subtle: "rgba(24, 24, 27, 0.08)",
      subtleHover: "rgba(24, 24, 27, 0.14)",
      border: "rgba(24, 24, 27, 0.25)",
      ring: "rgba(24, 24, 27, 0.30)",
    },
    dark: {
      main: "#ffffff", // Blanco puro en modo oscuro
      hover: "#e4e4e7", // Zinc 200
      active: "#d4d4d8", // Zinc 300
      contrast: "#09090b", // Texto oscuro sobre fondo blanco
      text: "#ffffff",
      subtle: "rgba(255, 255, 255, 0.12)",
      subtleHover: "rgba(255, 255, 255, 0.20)",
      border: "rgba(255, 255, 255, 0.30)",
      ring: "rgba(255, 255, 255, 0.40)",
    },
  },
] as const;

export const DEFAULT_ACCENT_COLOR: AccentColorId = "indigo";

export function getAccentDefinition(id: AccentColorId): AccentColorDefinition {
  const match = ACCENT_COLORS.find((c) => c.id === id);
  return match || ACCENT_COLORS[0];
}
