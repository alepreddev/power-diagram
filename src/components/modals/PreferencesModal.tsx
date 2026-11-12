import { useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
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
import {
  APP_LEGAL_INFO,
  DISCLAIMER_PARAGRAPHS,
  MIT_LICENSE_TEXT,
  PRIVACY_POLICY_ITEMS,
  THIRD_PARTY_LICENSES,
} from "@/config/legal";

type PreferenceSectionId = "about";

interface PreferenceSection {
  id: PreferenceSectionId;
  label: string;
  icon: typeof Info;
}

const PREFERENCE_SECTIONS: readonly PreferenceSection[] = [
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
              className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1"
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
            <p className="text-slate-700 dark:text-zinc-300">
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
                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
                className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium break-all text-left"
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
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
            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
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

              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {item.copyright}
              </p>

              {item.note && (
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {item.note}
                </p>
              )}

              {item.url && (
                <button
                  type="button"
                  onClick={() => openExternalLink(item.url!)}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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

/** Modal de Preferencias con sidebar lateral de categorías y sección "Acerca de". */
export function PreferencesModal({ open, onOpenChange }: PreferencesModalProps) {
  const [activeSection, setActiveSection] = useState<PreferenceSectionId>("about");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl h-[82vh] max-h-[700px] p-0 pb-0 gap-0 overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
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
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
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
              Más opciones de configuración próximamente.
            </p>
          </aside>

          {/* Panel de contenido al lado del sidebar */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Espacio superior para alinear con el botón de cerrar (X) sin encimar el scroll */}
            <div className="hidden sm:block h-10 shrink-0" aria-hidden="true" />
            <main className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-6 pb-6 pt-4 sm:pt-1">
              {activeSection === "about" && <AboutPreferencesContent />}
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
