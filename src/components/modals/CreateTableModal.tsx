import { useState, useEffect } from "react";
import { Plus, Trash2, Key, Database, MessageSquare } from "lucide-react";
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
import { useTranslation } from "@/store/useSettingsStore";
import type { ColumnData } from "@/lib/dbmlParser";

interface CreateTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const COLOR_PRESETS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Purple", value: "#a855f7" },
];

export const COMMON_SQL_TYPES = [
  "integer",
  "bigint",
  "smallint",
  "serial",
  "varchar",
  "varchar(255)",
  "text",
  "boolean",
  "timestamp",
  "timestamptz",
  "date",
  "numeric",
  "decimal(10,2)",
  "float",
  "uuid",
  "jsonb",
];

interface TableColumnsEditorProps {
  columns: ColumnData[];
  onColumnsChange: (columns: ColumnData[]) => void;
  datalistId: string;
  colNamePlaceholder: string;
  resetKey?: string | number | boolean;
  maxListHeightClass?: string;
}

/** Sección reutilizable para editar columnas, tipos SQL libres, restricciones (PK, AI, NN, UQ) y notas. */
export function TableColumnsEditor({
  columns,
  onColumnsChange,
  datalistId,
  colNamePlaceholder,
  resetKey,
  maxListHeightClass = "max-h-64",
}: TableColumnsEditorProps) {
  const { t } = useTranslation();
  const [expandedNoteRows, setExpandedNoteRows] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setExpandedNoteRows(new Set());
  }, [resetKey]);

  const handleAddColumn = () => {
    onColumnsChange([
      ...columns,
      {
        name: `col_${columns.length + 1}`,
        type: "varchar",
        pk: false,
        unique: false,
        notNull: false,
        increment: false,
      },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    onColumnsChange(columns.filter((_, i) => i !== index));
    setExpandedNoteRows((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      }
      return next;
    });
  };

  const handleColumnChange = <K extends keyof ColumnData>(
    index: number,
    field: K,
    value: ColumnData[K]
  ) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    onColumnsChange(updated);
  };

  const toggleNoteRow = (index: number) => {
    setExpandedNoteRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {t.modals.tableModal.columnsTitle(columns.length)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddColumn}
          className="h-7 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-app-accent-text" />
          <span>{t.modals.tableModal.addColumn}</span>
        </Button>
      </div>

      {/* Cabecera de columnas */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        <span className="col-span-4">{t.modals.tableModal.colHeaderName}</span>
        <span className="col-span-3">{t.modals.tableModal.colHeaderType}</span>
        <span className="col-span-4 text-center">{t.modals.tableModal.colHeaderConstraints}</span>
        <span className="col-span-1 text-right">{t.modals.tableModal.colHeaderDelete}</span>
      </div>

      <datalist id={datalistId}>
        {COMMON_SQL_TYPES.map((sqlType) => (
          <option key={sqlType} value={sqlType} />
        ))}
      </datalist>

      <div
        className={`${maxListHeightClass} overflow-y-auto space-y-2 pr-1 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 bg-slate-50/50 dark:bg-zinc-950/70`}
      >
        {columns.map((col, idx) => {
          const hasNote = Boolean(col.note?.trim());
          const isNoteExpanded = expandedNoteRows.has(idx);

          return (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 rounded-md text-xs shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-colors space-y-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                {/* Nombre del campo */}
                <div className="sm:col-span-4">
                  <Input
                    placeholder={colNamePlaceholder}
                    value={col.name}
                    onChange={(e) => handleColumnChange(idx, "name", e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-8 px-2.5 w-full font-medium"
                    required
                  />
                </div>

                {/* Input editable con sugerencias para conservar tipos personalizados o parametrizados */}
                <div className="sm:col-span-3">
                  <Input
                    list={datalistId}
                    value={col.type}
                    onChange={(e) => handleColumnChange(idx, "type", e.target.value)}
                    placeholder="varchar(255)"
                    className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs h-8 px-2 w-full font-mono"
                    required
                  />
                </div>

                {/* Toggles de restricciones: PK, AI, NN, UQ */}
                <div className="sm:col-span-4 flex items-center justify-center gap-2 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-md text-[11px] text-slate-600 dark:text-zinc-400 shrink-0">
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

                  <label className="flex items-center gap-1 cursor-pointer hover:text-emerald-500" title="Auto Increment">
                    <input
                      type="checkbox"
                      checked={col.increment}
                      onChange={(e) => handleColumnChange(idx, "increment", e.target.checked)}
                      className="rounded border-slate-300 dark:border-zinc-700 text-emerald-500 focus:ring-0 accent-emerald-500"
                    />
                    <span className={col.increment ? "font-bold text-emerald-600 dark:text-emerald-400" : ""}>AI</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer hover:text-app-accent-text" title="Not Null">
                    <input
                      type="checkbox"
                      checked={col.notNull}
                      onChange={(e) => handleColumnChange(idx, "notNull", e.target.checked)}
                      className="rounded border-slate-300 dark:border-zinc-700 text-app-accent-text focus:ring-0 accent-app-accent"
                    />
                    <span className={col.notNull ? "font-bold text-app-accent-text" : ""}>NN</span>
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

                {/* Acciones de columna: Nota + Eliminar */}
                <div className="sm:col-span-1 flex items-center justify-end gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNoteRow(idx)}
                    className={`h-8 w-7 p-0 rounded-md cursor-pointer ${
                      hasNote || isNoteExpanded
                        ? "text-app-accent-text bg-app-accent-subtle hover:bg-app-accent-subtle-hover"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                    title={col.note ? `${t.modals.tableModal.colNoteTooltip}: ${col.note}` : t.modals.tableModal.colNoteTooltip}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveColumn(idx)}
                    disabled={columns.length <= 1}
                    className="h-8 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-md disabled:opacity-20"
                    title={t.modals.tableModal.deleteColumnTitle}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {isNoteExpanded && (
                <div>
                  <Input
                    placeholder={t.modals.tableModal.colNotePlaceholder}
                    value={col.note || ""}
                    onChange={(e) => handleColumnChange(idx, "note", e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] h-7 px-2.5 w-full placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_CREATE_COLUMNS: ColumnData[] = [
  { name: "id", type: "integer", pk: true, unique: false, notNull: true, increment: true },
  { name: "created_at", type: "timestamp", pk: false, unique: false, notNull: true, increment: false },
];

export function CreateTableModal({ open, onOpenChange }: CreateTableModalProps) {
  const { addNewTable } = useDiagramStore();
  const { t } = useTranslation();

  const [tableName, setTableName] = useState("");
  const [headerColor, setHeaderColor] = useState(COLOR_PRESETS[0].value);
  const [note, setNote] = useState("");
  const [columns, setColumns] = useState<ColumnData[]>(() => DEFAULT_CREATE_COLUMNS.map((c) => ({ ...c })));
  const [resetSeq, setResetSeq] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tableName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanName) return;

    const sanitizedColumns = columns.map((c) => ({
      ...c,
      note: c.note?.trim() || undefined,
    }));

    addNewTable(cleanName, sanitizedColumns, headerColor, note.trim() || undefined);

    // Resetear formulario
    setTableName("");
    setHeaderColor(COLOR_PRESETS[0].value);
    setNote("");
    setColumns(DEFAULT_CREATE_COLUMNS.map((c) => ({ ...c })));
    setResetSeq((s) => s + 1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-3xl sm:max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-app-accent-text" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {t.modals.tableModal.createTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            {t.modals.tableModal.createDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nombre y Color */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.tableModal.tableNameLabel}
              </label>
              <Input
                placeholder={t.modals.tableModal.tableNamePlaceholder}
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-9 w-full shadow-sm"
                required
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.tableModal.accentColorLabel}
              </label>
              <div className="flex items-center gap-2 h-9 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-md">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setHeaderColor(c.value)}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      headerColor === c.value
                        ? "scale-125 ring-2 ring-app-accent dark:ring-white"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Descripción / Nota de la tabla */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {t.modals.tableModal.noteLabel}
            </label>
            <Input
              placeholder={t.modals.tableModal.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-8 w-full placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm"
            />
          </div>

          <TableColumnsEditor
            columns={columns}
            onColumnsChange={setColumns}
            datalistId="create-table-sql-types"
            colNamePlaceholder={t.modals.tableModal.colNamePlaceholder}
            resetKey={resetSeq}
            maxListHeightClass="max-h-60"
          />

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!tableName.trim()}
              className="h-9 px-5 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-md gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.modals.tableModal.createSubmit}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
