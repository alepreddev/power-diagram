import { useState, useEffect } from "react";
import { Trash2, Database } from "lucide-react";
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
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { COLOR_PRESETS, TableColumnsEditor } from "@/components/modals/CreateTableModal";
import type { ColumnData, TableNodeData } from "@/lib/dbmlParser";

interface EditTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableData: TableNodeData | null;
}

export function EditTableModal({ open, onOpenChange, tableData }: EditTableModalProps) {
  const { updateTable, deleteTable } = useDiagramStore();
  const { t } = useTranslation();

  const [activeTable, setActiveTable] = useState<TableNodeData | null>(tableData);
  const [tableName, setTableName] = useState("");
  const [headerColor, setHeaderColor] = useState(COLOR_PRESETS[0].value);
  const [note, setNote] = useState("");
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Sincronizar datos cada vez que se selecciona una tabla para editar
  useEffect(() => {
    if (tableData) {
      setActiveTable(tableData);
      setTableName(tableData.label);
      setHeaderColor(tableData.headerColor || COLOR_PRESETS[0].value);
      setNote(tableData.note || "");
      setColumns(
        tableData.columns && tableData.columns.length > 0
          ? tableData.columns.map((c) => ({ ...c }))
          : [{ name: "id", type: "integer", pk: true, unique: false, notNull: true, increment: true }]
      );
    }
    setIsDeleteConfirmOpen(false);
  }, [tableData, open]);

  const currentTable = tableData || activeTable;
  if (!currentTable) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tableName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanName) return;

    const sanitizedColumns = columns.map((c) => ({
      ...c,
      note: c.note?.trim() || undefined,
    }));

    updateTable(
      currentTable.label,
      cleanName,
      sanitizedColumns,
      headerColor,
      note.trim() || undefined
    );
    onOpenChange(false);
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteTable(currentTable.label);
    setIsDeleteConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[92vw] max-w-3xl sm:max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
          <DialogHeader className="pr-10 pb-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-app-accent-text" />
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {t.modals.tableModal.editTitlePrefix}{" "}
                <span className="text-app-accent-text font-mono">{currentTable.label}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {t.modals.tableModal.editDescription}
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
                  placeholder={t.modals.tableModal.editTableNamePlaceholder}
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
              datalistId="edit-table-sql-types"
              colNamePlaceholder={t.modals.tableModal.editColNamePlaceholder}
              resetKey={`${open}-${currentTable.label}`}
              maxListHeightClass="max-h-60"
            />

            {/* Footer con Eliminar a la izquierda y Guardar a la derecha */}
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                className="h-9 px-3.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 gap-1.5 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.modals.tableModal.deleteTableBtn}</span>
              </Button>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
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
                  className="h-9 px-5 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-md cursor-pointer"
                >
                  {t.common.saveChanges}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={t.modals.tableModal.deleteTableConfirmTitle}
        description={t.modals.tableModal.deleteTableConfirmDescription(currentTable.label)}
        confirmLabel={t.common.delete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
