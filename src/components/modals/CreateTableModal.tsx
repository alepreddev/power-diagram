import { useState } from "react";
import { Plus, Trash2, Key, Database } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiagramStore } from "@/store/useDiagramStore";
import type { ColumnData } from "@/lib/dbmlParser";

interface CreateTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_PRESETS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Purple", value: "#a855f7" },
];

const COMMON_SQL_TYPES = [
  "integer",
  "varchar",
  "text",
  "boolean",
  "timestamp",
  "numeric",
  "date",
  "jsonb",
];

export function CreateTableModal({ open, onOpenChange }: CreateTableModalProps) {
  const { addNewTable } = useDiagramStore();

  const [tableName, setTableName] = useState("");
  const [headerColor, setHeaderColor] = useState(COLOR_PRESETS[0].value);
  const [columns, setColumns] = useState<ColumnData[]>([
    { name: "id", type: "integer", pk: true, unique: false, notNull: true, increment: true },
    { name: "created_at", type: "timestamp", pk: false, unique: false, notNull: true, increment: false },
  ]);

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      { name: `col_${columns.length + 1}`, type: "varchar", pk: false, unique: false, notNull: false, increment: false },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: keyof ColumnData, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tableName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanName) return;

    addNewTable(cleanName, columns);
    // Resetear formulario
    setTableName("");
    setColumns([
      { name: "id", type: "integer", pk: true, unique: false, notNull: true, increment: true },
      { name: "created_at", type: "timestamp", pk: false, unique: false, notNull: true, increment: false },
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-3xl sm:max-w-3xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-2 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Crear Nueva Tabla Visualmente
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Define el nombre, color de encabezado y columnas. La tabla se inyectará de forma quirúrgica en el código DBML y en el lienzo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nombre y Color */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Nombre de la Tabla</label>
              <Input
                placeholder="ej. clientes, facturas, productos"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-9 w-full shadow-sm"
                required
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Color de Acento</label>
              <div className="flex items-center gap-2 h-9 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-md">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setHeaderColor(c.value)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      headerColor === c.value ? "scale-125 ring-2 ring-indigo-500 dark:ring-white" : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Listado dinámico de columnas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Columnas / Campos ({columns.length})</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                className="h-7 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Agregar Columna</span>
              </Button>
            </div>

            {/* Cabecera de columnas para orden visual */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              <span className="col-span-5">Nombre de Columna</span>
              <span className="col-span-3">Tipo SQL</span>
              <span className="col-span-3 text-center">Restricciones</span>
              <span className="col-span-1 text-right">Borrar</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 bg-slate-50/50 dark:bg-zinc-950/70">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 rounded-md text-xs shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Input nombre */}
                  <div className="sm:col-span-5">
                    <Input
                      placeholder="Nombre campo (ej. email)"
                      value={col.name}
                      onChange={(e) => handleColumnChange(idx, "name", e.target.value)}
                      className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-8 px-2.5 w-full font-medium"
                      required
                    />
                  </div>

                  {/* Selector tipo */}
                  <div className="sm:col-span-3">
                    <select
                      value={col.type}
                      onChange={(e) => handleColumnChange(idx, "type", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs rounded-md h-8 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    >
                      {COMMON_SQL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggles restricciones */}
                  <div className="sm:col-span-3 flex items-center justify-center gap-3 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-md text-[11px] text-slate-600 dark:text-zinc-400 shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer hover:text-amber-500" title="Primary Key">
                      <input
                        type="checkbox"
                        checked={col.pk}
                        onChange={(e) => handleColumnChange(idx, "pk", e.target.checked)}
                        className="rounded border-slate-300 dark:border-zinc-700 text-amber-500 focus:ring-0 accent-amber-500"
                      />
                      <Key className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                      <span className={col.pk ? "font-bold text-amber-600 dark:text-amber-400" : ""}>PK</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer hover:text-indigo-500" title="Not Null">
                      <input
                        type="checkbox"
                        checked={col.notNull}
                        onChange={(e) => handleColumnChange(idx, "notNull", e.target.checked)}
                        className="rounded border-slate-300 dark:border-zinc-700 text-indigo-500 focus:ring-0 accent-indigo-500"
                      />
                      <span className={col.notNull ? "font-bold text-indigo-600 dark:text-indigo-400" : ""}>NN</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer hover:text-sky-500" title="Unique">
                      <input
                        type="checkbox"
                        checked={col.unique}
                        onChange={(e) => handleColumnChange(idx, "unique", e.target.checked)}
                        className="rounded border-slate-300 dark:border-zinc-700 text-sky-500 focus:ring-0 accent-sky-500"
                      />
                      <span className={col.unique ? "font-bold text-sky-600 dark:text-sky-400" : ""}>UQ</span>
                    </label>
                  </div>

                  {/* Eliminar columna */}
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveColumn(idx)}
                      disabled={columns.length <= 1}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-md disabled:opacity-20"
                      title="Eliminar columna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!tableName.trim()}
              className="h-8 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
            >
              Crear Tabla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
