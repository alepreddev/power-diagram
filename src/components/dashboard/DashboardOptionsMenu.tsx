import { useState } from "react";
import { Settings, Sun, Moon, SlidersHorizontal } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PreferencesModal } from "@/components/modals/PreferencesModal";

/** Menú de opciones del Dashboard (Cambio de color y Preferencias). */
export function DashboardOptionsMenu() {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const isDark = resolvedTheme === "dark";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Opciones"
            aria-label="Opciones del dashboard"
          >
            <Settings className="w-4 h-4 transition-transform duration-200 hover:rotate-45" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-52">
          <DropdownMenuItem
            onSelect={toggleTheme}
            className="justify-between"
          >
            <span className="flex items-center gap-2.5">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
              <span>Cambio de color</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
              {isDark ? "Claro" : "Oscuro"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setIsPreferencesOpen(true)}>
            <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
            <span>Preferencias</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PreferencesModal
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />
    </>
  );
}
