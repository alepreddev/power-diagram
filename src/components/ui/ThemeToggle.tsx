import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useThemeStore();

  return (
    <div className={`relative inline-flex items-center ${className || ""}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title={
          resolvedTheme === "dark"
            ? "Cambiar a Modo Claro"
            : "Cambiar a Modo Oscuro"
        }
      >
        {resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500 transition-transform duration-200" />
        )}
      </Button>
    </div>
  );
}
