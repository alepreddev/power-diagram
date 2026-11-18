import { useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Sparkles,
  Info,
  SlidersHorizontal,
  ShieldCheck,
  Scale,
  FileText,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Tag,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useThemeStore } from "@/store/useThemeStore";
import { ACCENT_COLORS } from "@/config/themes";
import {
  APP_LEGAL_INFO,
  DISCLAIMER_PARAGRAPHS,
  MIT_LICENSE_TEXT,
  PRIVACY_POLICY_ITEMS,
  THIRD_PARTY_LICENSES,
} from "@/config/legal";

type PreferenceSectionId = "customize" | "about";

interface PreferenceSection {
  id: PreferenceSectionId;
  label: string;
  icon: typeof Palette | typeof Info;
}

const PREFERENCE_SECTIONS: readonly PreferenceSection[] = [
  { id: "customize", label: "Personalizar", icon: Palette },
  { id: "about", label: "Acerca de", icon: Info },
];

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function openExternalLink(url: string) {
  if (isTauri()) {
    try {
      await openUrl(url);
      return;
    } catch (err) {
      console.error("No se pudo abrir el enlace externo con plugin-opener:", err);
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Sección de Personalización: Modo claro/oscuro y Color general de la app */
function CustomizePreferencesContent() {
  const { theme, setTheme, accentColor, setAccentColor } = useThemeStore();

  const themeOptions = [
    {
      id: "light" as const,
      label: "Claro",
      description: "Fondo blanco limpio para entornos iluminados",
      icon: Sun,
    },
    {
      id: "dark" as const,
      label: "Oscuro",
      description: "Tonos oscuros relajantes para reducir la fatiga visual",
      icon: Moon,
    },
    {
      id: "system" as const,
      label: "Sistema",
      description: "Sincronizado con la preferencia del sistema operativo",
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
          Personalización
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Ajusta el modo de apariencia y el color general de acento aplicado a los botones, enlaces y efectos visuales de la aplicación.
        </p>
      </div>

      {/* 1. MODO DE APARIENCIA (CLARO / OSCURO / SISTEMA) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-app-accent-text shrink-0" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Modo de Apariencia
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                title={opt.description}
                className={`flex flex-col justify-between p-4 min-h-[96px] rounded-xl border text-left transition-all cursor-pointer relative group ${
                  isSelected
                    ? "bg-app-accent-subtle border-app-accent-border shadow-xs"
                    : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <Icon
                    className={`w-7 h-7 transition-colors ${
                      isSelected
                        ? "text-app-accent-text"
                        : "text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200"
                    }`}
                  />
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-app-accent text-app-accent-contrast flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mt-2">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. CONFIGURACIÓN DEL COLOR GENERAL DE LA APP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-app-accent-text shrink-0" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Color General de la App
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            {ACCENT_COLORS.length} colores disponibles
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Configura el color principal de los botones de acción, estados seleccionados y efectos de hover en toda la interfaz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {ACCENT_COLORS.map((color) => {
            const isSelected = accentColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setAccentColor(color.id)}
                title={`${color.label}: ${color.description}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[46px] ${
                  isSelected
                    ? "bg-app-accent-subtle border-app-accent-border ring-1 ring-app-accent-ring shadow-xs"
                    : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                {/* Muestra de color (Swatch) */}
                <div className="relative shrink-0">
                  {color.isMonochrome ? (
                    /* Monocromo: Círculo dividido blanco/oscuro para representar su adaptación */
                    <div
                      className="w-6 h-6 rounded-full border border-slate-300 dark:border-zinc-600 shadow-xs overflow-hidden flex"
                    >
                      <div className="w-1/2 h-full bg-[#18181b]" />
                      <div className="w-1/2 h-full bg-[#ffffff]" />
                    </div>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full shadow-xs border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: color.swatchHex }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                    {color.label}
                  </span>
                  {/* {color.isMonochrome && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                      Adaptable
                    </span>
                  )} */}
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-app-accent-text shrink-0 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. VISTA PREVIA INTERACTIVA */}
      {/* <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-app-accent-text" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Vista Previa de Componentes
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            Prueba los botones y efectos en tiempo real
          </span>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-8 px-4 rounded-lg bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Botón Principal</span>
          </button>

          <button
            type="button"
            className="h-8 px-3.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-transparent text-slate-700 dark:text-zinc-200 hover:text-app-accent-text hover:border-app-accent-border hover:bg-app-accent-subtle text-xs font-medium transition-colors cursor-pointer"
          >
            Hover Secundario
          </button>

          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-app-accent-subtle text-app-accent-text border border-app-accent-border">
            Insignia Activa
          </span>

          <span className="text-xs font-semibold text-app-accent-text cursor-pointer hover:underline">
            Enlace de Énfasis
          </span>
        </div>
      </section> */}
    </div>
  );
}

/** Sección de Acerca de e información legal */
function AboutPreferencesContent() {
  const [licenseSearch, setLicenseSearch] = useState("");
  const [showMitText, setShowMitText] = useState(false);

  const filteredLicenses = useMemo(() => {
    const q = licenseSearch.trim().toLowerCase();
    if (!q) return THIRD_PARTY_LICENSES;
    return THIRD_PARTY_LICENSES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.license.toLowerCase().includes(q) ||
        item.layer.toLowerCase().includes(q) ||
        item.copyright.toLowerCase().includes(q)
    );
  }, [licenseSearch]);

  return (
    <div className="space-y-6">
      {/* Cabecera de identidad de la app */}
      <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo.png"
              alt={APP_LEGAL_INFO.appName}
              className="w-11 h-11 rounded-xl object-contain dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {APP_LEGAL_INFO.appName}
                </h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  v{__APP_VERSION__}
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  Open Source · {APP_LEGAL_INFO.licenseName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {APP_LEGAL_INFO.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Metadatos legales, propietario, espacio futuro para marca/correo y repo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Copyright y Titular
            </span>
            <p className="font-medium text-slate-800 dark:text-zinc-200">
              © {APP_LEGAL_INFO.copyrightYear} {APP_LEGAL_INFO.ownerName}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Marca
            </span>
            <p className="text-slate-500 dark:text-zinc-400">
              {APP_LEGAL_INFO.brandName ?? "Autor independiente (por definir)"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Correo de contacto
            </span>
            {APP_LEGAL_INFO.contactEmail ? (
              <button
                type="button"
                onClick={() => openExternalLink(`mailto:${APP_LEGAL_INFO.contactEmail}`)}
                className="text-app-accent-text hover:underline cursor-pointer"
              >
                {APP_LEGAL_INFO.contactEmail}
              </button>
            ) : (
              <p className="text-slate-500 dark:text-zinc-400 italic">
                Disponible próximamente al definir marca
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Repositorio oficial
            </span>
            <div>
              <button
                type="button"
                onClick={() => openExternalLink(APP_LEGAL_INFO.repositoryUrl)}
                className="inline-flex items-center gap-1.5 text-app-accent-text hover:underline cursor-pointer font-medium break-all text-left"
              >
                <span>github.com/alepreddev/power-diagram</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Texto de licencia MIT desplegable */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowMitText((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-app-accent-text transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showMitText ? "Ocultar texto de Licencia MIT" : "Ver texto completo de Licencia MIT"}</span>
            {showMitText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showMitText && (
            <pre className="mt-3 p-3.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] leading-relaxed font-mono text-slate-600 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto">
              {MIT_LICENSE_TEXT}
            </pre>
          )}
        </div>
      </section>

      {/* Política de Privacidad Local */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Política de Privacidad Local
            </h4>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
            100 % Offline-First
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {PRIVACY_POLICY_ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/60 p-3"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Exención de responsabilidad y marcas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-500 shrink-0" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Exención de Responsabilidad y Aviso de Marcas
          </h4>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/60 p-4 space-y-2.5">
          {DISCLAIMER_PARAGRAPHS.map((paragraph, idx) => (
            <p
              key={idx}
              className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Licencias de Terceros */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-app-accent-text shrink-0" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Licencias de Terceros ({filteredLicenses.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={licenseSearch}
              onChange={(e) => setLicenseSearch(e.target.value)}
              placeholder="Filtrar librería o licencia..."
              className="h-8 pl-8 text-xs bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredLicenses.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/60 p-3 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                    {item.version}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                    {item.layer}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {item.license}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400">
                {item.copyright}
              </p>

              {item.note && (
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                  {item.note}
                </p>
              )}

              {item.url && (
                <button
                  type="button"
                  onClick={() => openExternalLink(item.url!)}
                  className="inline-flex items-center gap-1 text-[11px] text-app-accent-text hover:underline cursor-pointer"
                >
                  <span>{item.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {filteredLicenses.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 p-4 text-center text-xs text-slate-500 dark:text-zinc-400">
              No se encontraron librerías para «{licenseSearch}».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Modal de Preferencias con sidebar lateral de categorías ("Personalizar" y "Acerca de"). */
export function PreferencesModal({ open, onOpenChange }: PreferencesModalProps) {
  const [activeSection, setActiveSection] = useState<PreferenceSectionId>("customize");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl h-[84vh] max-h-[720px] p-0 pb-0 gap-0 overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
        <DialogDescription className="sr-only">
          Preferencias de Power Diagram
        </DialogDescription>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar izquierdo con título y opciones de preferencias */}
          <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-3 flex sm:flex-col justify-between gap-2 overflow-x-auto sm:overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 pt-1 pr-10 sm:pr-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-zinc-300 shrink-0" />
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Preferencias
                </DialogTitle>
              </div>

              <nav aria-label="Categorías de preferencias" className="flex sm:flex-col gap-1">
                {PREFERENCE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-app-accent-subtle text-app-accent-text border border-app-accent-border font-semibold shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800/70 hover:text-slate-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <p className="hidden sm:block px-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500">
              Personalización y configuración general.
            </p>
          </aside>

          {/* Panel de contenido al lado del sidebar */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Espacio superior para alinear con el botón de cerrar (X) sin encimar el scroll */}
            <div className="hidden sm:block h-10 shrink-0" aria-hidden="true" />
            <main className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-6 pb-6 pt-4 sm:pt-1">
              {activeSection === "customize" && <CustomizePreferencesContent />}
              {activeSection === "about" && <AboutPreferencesContent />}
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
