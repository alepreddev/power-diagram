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
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <DialogTitle className="text-base font-bold text-zinc-100">
              Crear Nueva Tabla Visualmente
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Define el nombre, color y columnas de la tabla. Se inyectará automáticamente en el código DBML y en el lienzo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Nombre y Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Nombre de la Tabla</label>
              <Input
                placeholder="ej. clientes, facturas, productos"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Color de Acento</label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setHeaderColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      headerColor === c.value ? "scale-110 ring-2 ring-white" : "opacity-70 hover:opacity-100"
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Columnas / Campos ({columns.length})</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                className="h-7 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200 gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agregar Columna</span>
              </Button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-zinc-800 rounded-lg p-2 bg-zinc-950/60">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 p-2 rounded text-xs"
                >
                  <div className="flex-1 min-w-[120px]">
                    <Input
                      placeholder="Nombre campo"
                      value={col.name}
                      onChange={(e) => handleColumnChange(idx, "name", e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-7 px-2"
                      required
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <select
                      value={col.type}
                      onChange={(e) => handleColumnChange(idx, "type", e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded h-7 px-1.5 focus:outline-none"
                    >
                      {COMMON_SQL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Badges y toggles de restricciones */}
                  <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-400 shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer" title="Primary Key">
                      <input
                        type="checkbox"
                        checked={col.pk}
                        onChange={(e) => handleColumnChange(idx, "pk", e.target.checked)}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                      <Key className="w-3 h-3 text-amber-400" />
                      <span>PK</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer" title="Not Null">
                      <input
                        type="checkbox"
                        checked={col.notNull}
                        onChange={(e) => handleColumnChange(idx, "notNull", e.target.checked)}
                        className="rounded border-zinc-700 text-indigo-500 focus:ring-0"
                      />
                      <span>NN</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer" title="Unique">
                      <input
                        type="checkbox"
                        checked={col.unique}
                        onChange={(e) => handleColumnChange(idx, "unique", e.target.checked)}
                        className="rounded border-zinc-700 text-sky-500 focus:ring-0"
                      />
                      <span>UQ</span>
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveColumn(idx)}
                    disabled={columns.length <= 1}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!tableName.trim()}
              className="h-8 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Crear Tabla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

