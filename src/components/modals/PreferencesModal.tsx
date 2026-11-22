import { useEffect, useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Info,
  SlidersHorizontal,
  Settings,
  Save,
  Languages,
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
import { useSettingsStore, useTranslation } from "@/store/useSettingsStore";
import { ACCENT_COLORS } from "@/config/themes";
import { LANGUAGE_OPTIONS, type AppLanguage } from "@/i18n/translations";
import {
  APP_LEGAL_INFO,
  MIT_LICENSE_TEXT,
  THIRD_PARTY_LICENSES,
} from "@/config/legal";

export type PreferenceSectionId = "customize" | "settings" | "about";

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: PreferenceSectionId;
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
  const { t } = useTranslation();

  const themeOptions = [
    {
      id: "light" as const,
      label: t.preferences.customize.themes.light.label,
      description: t.preferences.customize.themes.light.description,
      icon: Sun,
    },
    {
      id: "dark" as const,
      label: t.preferences.customize.themes.dark.label,
      description: t.preferences.customize.themes.dark.description,
      icon: Moon,
    },
    {
      id: "system" as const,
      label: t.preferences.customize.themes.system.label,
      description: t.preferences.customize.themes.system.description,
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
          {t.preferences.customize.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          {t.preferences.customize.description}
        </p>
      </div>

      {/* 1. MODO DE APARIENCIA (CLARO / OSCURO / SISTEMA) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-app-accent-text shrink-0" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            {t.preferences.customize.appearanceModeTitle}
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
              {t.preferences.customize.accentColorTitle}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            {t.preferences.customize.availableColors(ACCENT_COLORS.length)}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {t.preferences.customize.accentColorDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {ACCENT_COLORS.map((color) => {
            const isSelected = accentColor === color.id;
            const localizedAccent = t.preferences.customize.accents[color.id];
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setAccentColor(color.id)}
                title={`${localizedAccent.label}: ${localizedAccent.description}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[46px] ${
                  isSelected
                    ? "bg-app-accent-subtle border-app-accent-border ring-1 ring-app-accent-ring shadow-xs"
                    : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                {/* Muestra de color (Swatch) */}
                <div className="relative shrink-0">
                  {color.isMonochrome ? (
                    <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-zinc-600 shadow-xs overflow-hidden flex">
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
                    {localizedAccent.label}
                  </span>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-app-accent-text shrink-0 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Sección de Configuración: Autoguardado e Idioma del Sistema */
function SettingsPreferencesContent() {
  const autoSave = useSettingsStore((state) => state.autoSave);
  const setAutoSave = useSettingsStore((state) => state.setAutoSave);
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
          {t.preferences.settings.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          {t.preferences.settings.description}
        </p>
      </div>

      {/* 1. AUTOGUARDADO */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 text-app-accent-text shrink-0" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            {t.preferences.settings.autoSaveSectionTitle}
          </h4>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                {t.preferences.settings.autoSaveLabel}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  autoSave
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                }`}
              >
                {autoSave ? t.common.active : t.common.disabled}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              {t.preferences.settings.autoSaveDescription}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoSave}
            aria-label={t.preferences.settings.autoSaveSwitchAria}
            onClick={() => setAutoSave(!autoSave)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent-ring ${
              autoSave
                ? "bg-app-accent border-app-accent"
                : "bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
                autoSave
                  ? "translate-x-6 bg-app-accent-contrast"
                  : "translate-x-1 bg-white dark:bg-zinc-300"
              }`}
            />
          </button>
        </div>
      </section>

      {/* 2. IDIOMA DEL SISTEMA */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-app-accent-text shrink-0" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            {t.preferences.settings.languageSectionTitle}
          </h4>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {t.preferences.settings.languageDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.available && language === opt.id;
            const localizedName = opt.labels[language];

            if (!opt.available) {
              return (
                <div
                  key={opt.id}
                  aria-disabled="true"
                  className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800/90 bg-slate-50/70 dark:bg-zinc-950/50 opacity-70 cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {opt.code}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">
                        {opt.nativeName}
                      </span>
                      <span className="block text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                        {localizedName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                    {t.common.comingSoon}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLanguage(opt.id as AppLanguage)}
                className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-app-accent-subtle border-app-accent-border ring-1 ring-app-accent-ring shadow-xs"
                    : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-app-accent text-app-accent-contrast"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                    }`}
                  >
                    {opt.code}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                      {opt.nativeName}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      {localizedName}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-app-accent text-app-accent-contrast flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Sección de Acerca de e información legal */
function AboutPreferencesContent() {
  const [licenseSearch, setLicenseSearch] = useState("");
  const [showMitText, setShowMitText] = useState(false);
  const { t } = useTranslation();

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
                  {t.preferences.about.openSourceBadge(APP_LEGAL_INFO.licenseName)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {APP_LEGAL_INFO.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Metadatos legales, propietario, marca, correo y repo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {t.preferences.about.copyrightTitle}
            </span>
            <p className="font-medium text-slate-800 dark:text-zinc-200">
              © {APP_LEGAL_INFO.copyrightYear} {APP_LEGAL_INFO.ownerName}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {t.preferences.about.brandTitle}
            </span>
            <p className="text-slate-500 dark:text-zinc-400">
              {APP_LEGAL_INFO.brandName ?? t.preferences.about.independentAuthor}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {t.preferences.about.contactEmailTitle}
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
                {t.preferences.about.emailPending}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {t.preferences.about.repositoryTitle}
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
            <span>{showMitText ? t.preferences.about.hideMit : t.preferences.about.showMit}</span>
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
              {t.preferences.about.privacyTitle}
            </h4>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
            {t.preferences.about.offlineBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {t.preferences.about.privacyItems.map((item) => (
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
            {t.preferences.about.disclaimerTitle}
          </h4>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/60 p-4 space-y-2.5">
          {t.preferences.about.disclaimerParagraphs.map((paragraph, idx) => (
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
              {t.preferences.about.thirdPartyTitle}
            </h4>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={licenseSearch}
              onChange={(e) => setLicenseSearch(e.target.value)}
              placeholder={t.preferences.about.searchLicensesPlaceholder}
              className="h-8 pl-8 text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
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
                    {t.preferences.about.layers[item.layer]}
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
              {t.preferences.about.noLicensesFound(licenseSearch)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Modal de Preferencias con sidebar lateral ("Personalizar", "Configuración" y "Acerca de"). */
export function PreferencesModal({
  open,
  onOpenChange,
  defaultSection = "customize",
}: PreferencesModalProps) {
  const [activeSection, setActiveSection] = useState<PreferenceSectionId>(defaultSection);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      setActiveSection(defaultSection);
    }
  }, [open, defaultSection]);

  const sections = [
    { id: "customize" as const, label: t.preferences.tabs.customize, icon: Palette },
    { id: "settings" as const, label: t.preferences.tabs.settings, icon: Settings },
    { id: "about" as const, label: t.preferences.tabs.about, icon: Info },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl h-[84vh] max-h-[720px] p-0 pb-0 gap-0 overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
        <DialogDescription className="sr-only">
          {t.preferences.srDescription}
        </DialogDescription>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar izquierdo con título y opciones de preferencias */}
          <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-3 flex sm:flex-col justify-between gap-2 overflow-x-auto sm:overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 pt-1 pr-10 sm:pr-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-zinc-300 shrink-0" />
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {t.preferences.title}
                </DialogTitle>
              </div>

              <nav aria-label={t.preferences.navAria} className="flex sm:flex-col gap-1">
                {sections.map((section) => {
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
              {t.preferences.footerNote}
            </p>
          </aside>

          {/* Panel de contenido al lado del sidebar */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Espacio superior para alinear con el botón de cerrar (X) sin encimar el scroll */}
            <div className="hidden sm:block h-10 shrink-0" aria-hidden="true" />
            <main className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-6 pb-6 pt-4 sm:pt-1">
              {activeSection === "customize" && <CustomizePreferencesContent />}
              {activeSection === "settings" && <SettingsPreferencesContent />}
              {activeSection === "about" && <AboutPreferencesContent />}
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
