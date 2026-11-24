import { useState, useEffect, useMemo } from "react";
import { Layers, ListTree, StickyNote, Plus } from "lucide-react";
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
import { COLOR_PRESETS } from "@/components/modals/CreateTableModal";

export type CanvasElementKind = "group" | "enum" | "note";

interface CreateCanvasElementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CanvasElementKind | null;
}

export function CreateCanvasElementModal({
  open,
  onOpenChange,
  mode,
}: CreateCanvasElementModalProps) {
  const { nodes, addTableGroup, addEnum, addStickyNote } = useDiagramStore();
  const { t } = useTranslation();

  const [cachedMode, setCachedMode] = useState<CanvasElementKind | null>(mode);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [textAreaValue, setTextAreaValue] = useState("");

  useEffect(() => {
    if (mode) setCachedMode(mode);
    if (open) {
      setName("");
      setColor(COLOR_PRESETS[0].value);
      setSelectedTables([]);
      setTextAreaValue("");
    }
  }, [open, mode]);

  const activeMode = mode || cachedMode;

  const tableNames = useMemo(
    () => nodes.filter((n) => n.type === "table").map((n) => n.data.label),
    [nodes]
  );

  if (!activeMode) return null;

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((item) => item !== tableName) : [...prev, tableName]
    );
  };

  const cleanIdentifier = (raw: string) =>
    raw.trim().toLowerCase().replace(/\s+/g, "_");

  const isSubmitDisabled = () => {
    if (!name.trim()) return true;
    if (activeMode === "group") return selectedTables.length === 0;
    if (activeMode === "enum") {
      return textAreaValue
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean).length === 0;
    }
    return !textAreaValue.trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = cleanIdentifier(name);
    if (!id) return;

    if (activeMode === "group") {
      if (selectedTables.length === 0) return;
      addTableGroup(id, selectedTables, color);
    } else if (activeMode === "enum") {
      const values = textAreaValue
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) return;
      addEnum(id, values);
    } else {
      if (!textAreaValue.trim()) return;
      addStickyNote(id, textAreaValue.trim());
    }

    onOpenChange(false);
  };

  const copy = t.modals.canvasElementModal[activeMode];
  const HeaderIcon =
    activeMode === "group" ? Layers : activeMode === "enum" ? ListTree : StickyNote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-1">
          <div className="flex items-center gap-2">
            <HeaderIcon className="w-5 h-5 text-app-accent-text" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {copy.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {copy.nameLabel}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-9 w-full"
              autoFocus
              required
            />
          </div>

          {activeMode === "group" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  {t.modals.canvasElementModal.group.colorLabel}
                </label>
                <div className="flex items-center gap-2.5 h-9 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-md">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        color === c.value
                          ? "scale-125 ring-2 ring-app-accent dark:ring-white"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  {t.modals.canvasElementModal.group.tablesLabel}
                </label>
                {tableNames.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500">
                    {t.modals.canvasElementModal.group.noTables}
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                    {tableNames.map((tbl) => {
                      const checked = selectedTables.includes(tbl);
                      return (
                        <label
                          key={tbl}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                            checked
                              ? "bg-app-accent-subtle border-app-accent-border text-app-accent-text font-semibold"
                              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTableSelection(tbl)}
                            className="accent-app-accent"
                          />
                          <span className="truncate font-mono">{tbl}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {activeMode === "enum" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.canvasElementModal.enum.valuesLabel}
              </label>
              <textarea
                value={textAreaValue}
                onChange={(e) => setTextAreaValue(e.target.value)}
                placeholder={t.modals.canvasElementModal.enum.valuesPlaceholder}
                rows={5}
                className="w-full rounded-md border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-app-accent"
                required
              />
            </div>
          )}

          {activeMode === "note" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.canvasElementModal.note.contentLabel}
              </label>
              <textarea
                value={textAreaValue}
                onChange={(e) => setTextAreaValue(e.target.value)}
                placeholder={t.modals.canvasElementModal.note.contentPlaceholder}
                rows={5}
                className="w-full rounded-md border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-app-accent"
                required
              />
            </div>
          )}

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
              disabled={isSubmitDisabled()}
              className="h-9 px-5 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-md gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{copy.submit}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
