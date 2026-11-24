import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  useStore,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Search,
  Grid3x3,
  Layers,
  ListTree,
  StickyNote,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { TableNodeMemo } from "./TableNode";
import { EnumNodeMemo, NoteNodeMemo, GroupNodeMemo } from "./CanvasNodes";
import { RelationshipEdgeMemo } from "./RelationshipEdge";
import { CanvasSearchPalette } from "./CanvasSearchPalette";
import {
  CreateCanvasElementModal,
  type CanvasElementKind,
} from "@/components/modals/CreateCanvasElementModal";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useSettingsStore, useTranslation } from "@/store/useSettingsStore";
import { getAccentDefinition } from "@/config/themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Pestaña flotante que muestra el porcentaje de zoom cada vez que cambia. */
function ZoomIndicator() {
  const zoom = useStore((state) => state.transform[2]);
  const { zoomTo } = useReactFlow();
  const { t } = useTranslation();
  const zoomPercent = Math.round(zoom * 100);

  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<"in" | "out" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isReadyRef = useRef(false);
  const prevZoomRef = useRef(zoomPercent);
  const latestZoomRef = useRef(zoomPercent);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestZoomRef.current = zoomPercent;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(
    (delay = 1800) => {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, delay);
    },
    [clearHideTimer]
  );

  // Evita disparar el indicador durante el fitView inicial al montar el lienzo
  useEffect(() => {
    const readyTimer = setTimeout(() => {
      prevZoomRef.current = latestZoomRef.current;
      isReadyRef.current = true;
    }, 250);

    return () => {
      clearTimeout(readyTimer);
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    if (!isReadyRef.current) {
      prevZoomRef.current = zoomPercent;
      return;
    }

    if (zoomPercent !== prevZoomRef.current) {
      setDirection(zoomPercent > prevZoomRef.current ? "in" : "out");
      prevZoomRef.current = zoomPercent;
      setIsVisible(true);
      if (!isHovered) {
        scheduleHide(1800);
      }
    }
  }, [zoomPercent, isHovered, scheduleHide]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    clearHideTimer();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVisible) {
      scheduleHide(1200);
    }
  };

  return (
    <button
      type="button"
      onClick={() => zoomTo(1, { duration: 250 })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={t.canvas.zoomTooltip(zoomPercent)}
      aria-live="polite"
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-mono font-semibold bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 shadow-lg hover:border-app-accent-border transition-all duration-200 cursor-pointer select-none ${
        isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-2 scale-95 pointer-events-none"
      }`}
    >
      {direction === "out" ? (
        <ZoomOut className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
      ) : (
        <ZoomIn className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
      )}
      <span className="tabular-nums">{zoomPercent}%</span>
    </button>
  );
}

const INITIAL_FIT_VIEW_OPTIONS = { minZoom: 1, maxZoom: 1 };
const FIT_VIEW_OPTIONS = { maxZoom: 1 };

function CanvasContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    layoutVersion,
    centerViewVersion,
    past,
    future,
    undo,
    redo,
    runAutoLayout,
  } = useDiagramStore();
  const { resolvedTheme, accentColor } = useThemeStore();
  const {
    snapToGrid,
    toggleSnapToGrid,
    layoutDirection,
    setLayoutDirection,
    layoutSpacing,
    setLayoutSpacing,
  } = useSettingsStore();
  const { t } = useTranslation();
  const { fitView } = useReactFlow();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [elementModalKind, setElementModalKind] = useState<CanvasElementKind | null>(null);

  const nodeTypes = useMemo(
    () => ({
      table: TableNodeMemo,
      enum: EnumNodeMemo,
      note: NoteNodeMemo,
      group: GroupNodeMemo,
    }),
    []
  );
  const edgeTypes = useMemo(() => ({ relation: RelationshipEdgeMemo }), []);

  const isDark = resolvedTheme === "dark";
  const accentDef = getAccentDefinition(accentColor);
  const accentMain = (isDark ? accentDef.dark : accentDef.light).main;

  useEffect(() => {
    if (layoutVersion === 0) return;
    const timer = setTimeout(() => {
      fitView({ duration: 400, ...FIT_VIEW_OPTIONS });
    }, 60);
    return () => clearTimeout(timer);
  }, [layoutVersion, fitView]);

  useEffect(() => {
    if (centerViewVersion === 0) return;
    fitView({ duration: 300, ...FIT_VIEW_OPTIONS });
  }, [centerViewVersion, fitView]);

  // Atajo global Ctrl+K / Cmd+K para abrir el buscador rápido del lienzo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAutoLayout = useCallback(async () => {
    await runAutoLayout({ direction: layoutDirection, spacing: layoutSpacing });
  }, [runAutoLayout, layoutDirection, layoutSpacing]);

  return (
    <div className="relative w-full h-full bg-slate-100/90 dark:bg-zinc-950 transition-colors">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={INITIAL_FIT_VIEW_OPTIONS}
        minZoom={0.15}
        maxZoom={2}
        colorMode={resolvedTheme}
        className={resolvedTheme}
        defaultEdgeOptions={{
          type: "relation",
          style: { stroke: isDark ? "#64748b" : "#475569", strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? "#27272a" : "#cbd5e1"}
        />
        <Controls
          position="bottom-left"
          showInteractive={true}
          fitViewOptions={FIT_VIEW_OPTIONS}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "group") return "transparent";
            if (node.type === "note") return "#f59e0b";
            if (node.type === "enum") return "#8b5cf6";
            return accentMain;
          }}
          maskColor={isDark ? "rgba(9, 9, 11, 0.75)" : "rgba(241, 245, 249, 0.75)"}
          className="!bg-white/90 !border-slate-300 dark:!bg-zinc-900/90 dark:!border-zinc-800 rounded-lg shadow-xl"
        />
      </ReactFlow>

      {/* Barra de herramientas flotante del Lienzo */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ZoomIndicator />

        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-slate-200 dark:border-zinc-800 p-1.5 rounded-lg shadow-lg">
          {/* Deshacer / Rehacer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={past.length === 0}
            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 cursor-pointer"
            title={t.canvas.undoTooltip}
            aria-label={t.canvas.undoTooltip}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={future.length === 0}
            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 cursor-pointer"
            title={t.canvas.redoTooltip}
            aria-label={t.canvas.redoTooltip}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

          {/* Buscador rápido (Ctrl + K) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="h-8 w-8 p-0 text-slate-600 hover:text-app-accent-text hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
            title={t.canvas.searchTooltip}
            aria-label={t.canvas.searchTooltip}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          {/* Ajuste a cuadrícula (Snap to Grid) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSnapToGrid}
            aria-pressed={snapToGrid}
            className={`h-8 w-8 p-0 cursor-pointer transition-colors ${
              snapToGrid
                ? "bg-app-accent-subtle text-app-accent-text border border-app-accent-border"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            }`}
            title={`${t.canvas.snapToGridTooltip} · ${snapToGrid ? t.canvas.snapToGridOn : t.canvas.snapToGridOff}`}
            aria-label={t.canvas.snapToGridTooltip}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
          </Button>

          {/* Añadir Grupo / Enum / Nota */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer"
                title={t.canvas.addElementTitle}
              >
                <Plus className="w-3.5 h-3.5 text-app-accent-text" />
                <span className="hidden lg:inline">{t.canvas.addElementLabel}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={6} className="w-60">
              <DropdownMenuItem onSelect={() => setElementModalKind("group")}>
                <Layers className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                <span>{t.canvas.addGroup}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setElementModalKind("enum")}>
                <ListTree className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
                <span>{t.canvas.addEnum}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setElementModalKind("note")}>
                <StickyNote className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>{t.canvas.addNote}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

          {/* Botón dividido Auto-Ordenar + Opciones de Dirección y Espaciado */}
          <div className="inline-flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="h-8 gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200 rounded-r-none cursor-pointer"
              title={t.canvas.autoLayoutTitle}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="hidden sm:inline">{t.canvas.autoLayout}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-6 px-0 rounded-l-none border-l-0 bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title={t.canvas.layoutOptionsTitle}
                  aria-label={t.canvas.layoutOptionsTitle}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={6} className="w-60">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {t.canvas.layoutDirectionLabel}
                </div>
                <DropdownMenuItem
                  onSelect={() => {
                    setLayoutDirection("RIGHT");
                    void runAutoLayout({ direction: "RIGHT", spacing: layoutSpacing });
                  }}
                  className="justify-between"
                >
                  <span>{t.canvas.layoutHorizontal}</span>
                  {layoutDirection === "RIGHT" && (
                    <Check className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setLayoutDirection("DOWN");
                    void runAutoLayout({ direction: "DOWN", spacing: layoutSpacing });
                  }}
                  className="justify-between"
                >
                  <span>{t.canvas.layoutVertical}</span>
                  {layoutDirection === "DOWN" && (
                    <Check className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {t.canvas.layoutSpacingLabel}
                </div>
                {(
                  [
                    { id: "compact" as const, label: t.canvas.spacingCompact },
                    { id: "normal" as const, label: t.canvas.spacingNormal },
                    { id: "spacious" as const, label: t.canvas.spacingSpacious },
                  ] as const
                ).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => {
                      setLayoutSpacing(item.id);
                      void runAutoLayout({ direction: layoutDirection, spacing: item.id });
                    }}
                    className="justify-between"
                  >
                    <span>{item.label}</span>
                    {layoutSpacing === item.id && (
                      <Check className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fitView({ duration: 300, ...FIT_VIEW_OPTIONS })}
            className="h-8 gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer"
            title={t.canvas.centerViewTitle}
          >
            <ZoomIn className="w-3.5 h-3.5 text-app-accent-text" />
            <span className="hidden sm:inline">{t.canvas.centerView}</span>
          </Button>
        </div>
      </div>

      {/* Paleta de búsqueda rápida (Ctrl + K) */}
      <CanvasSearchPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Modal para añadir TableGroup / Enum / Note */}
      <CreateCanvasElementModal
        open={elementModalKind !== null}
        onOpenChange={(open) => {
          if (!open) setElementModalKind(null);
        }}
        mode={elementModalKind}
      />
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
