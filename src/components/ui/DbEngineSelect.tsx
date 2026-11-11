import { Braces, Database } from "lucide-react";
import { cn } from "cn";
import postgresqlIcon from "@/assets/db-icons/postgresql.svg";
import mysqlIcon from "@/assets/db-icons/mysql.svg";
import sqliteIcon from "@/assets/db-icons/sqlite.svg";
import mssqlIcon from "@/assets/db-icons/mssql.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DbEngineOption<T extends string = string> {
  value: T;
  label: string;
}

const DB_ICON_MAP: Record<string, { src: string; alt: string; darkBoost?: boolean }> = {
  postgres: { src: postgresqlIcon, alt: "PostgreSQL", darkBoost: true },
  mysql: { src: mysqlIcon, alt: "MySQL", darkBoost: true },
  sqlite: { src: sqliteIcon, alt: "SQLite" },
  mssql: { src: mssqlIcon, alt: "SQL Server" },
};

/** Ícono vectorial oficial del motor de base de datos o formato de exportación. */
export function DbEngineIcon({
  engine,
  className,
}: {
  engine: string;
  className?: string;
}) {
  const key = engine.toLowerCase();
  if (key === "json") {
    return (
      <Braces
        className={cn("w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0", className)}
      />
    );
  }

  const icon = DB_ICON_MAP[key];
  if (!icon) {
    return <Database className={cn("w-4 h-4 text-slate-400 shrink-0", className)} />;
  }

  return (
    <img
      src={icon.src}
      alt={icon.alt}
      className={cn(
        "w-4 h-4 object-contain shrink-0",
        icon.darkBoost && "dark:brightness-125",
        className
      )}
    />
  );
}

interface DbEngineSelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly DbEngineOption<T>[];
  triggerClassName?: string;
}

/** Selector desplegable personalizado con el ícono de cada motor de base de datos. */
export function DbEngineSelect<T extends string>({
  value,
  onValueChange,
  options,
  triggerClassName,
}: DbEngineSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(val) => onValueChange(val as T)}>
      <SelectTrigger className={triggerClassName}>
        <span className="flex items-center gap-2 min-w-0 truncate">
          <DbEngineIcon engine={value} />
          <SelectValue />
        </span>
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2.5">
              <DbEngineIcon engine={option.value} />
              <SelectItemText>{option.label}</SelectItemText>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
