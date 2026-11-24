import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import {
  parseDbmlToGraph,
  recomputeGroupNodes,
  appendTableToDbml,
  appendRefToDbml,
  removeRefFromDbml,
  updateRefInDbml,
  updateTableInDbml,
  removeTableFromDbml,
  appendEnumToDbml,
  removeEnumFromDbml,
  appendStickyNoteToDbml,
  removeStickyNoteFromDbml,
  appendTableGroupToDbml,
  removeTableGroupFromDbml,
  type DiagramNode,
  type TableEdge,
  type TableNodeData,
  type RelationshipType,
  type ParserError,
  type ColumnData,
  type CanvasPositions,
} from "@/lib/dbmlParser";
import {
  type Project,
  getDiagramByProjectId,
  saveDiagramState,
} from "@/db/database";
import { layoutDiagramWithElk, type AutoLayoutOptions } from "@/lib/autoLayout";
import { useSettingsStore } from "@/store/useSettingsStore";

const MAX_HISTORY = 50;
const TEXT_HISTORY_COALESCE_MS = 800;

export interface DiagramSnapshot {
  dbmlCode: string;
  positions: CanvasPositions;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let highlightTimer: ReturnType<typeof setTimeout> | null = null;
let dragStartSnapshot: DiagramSnapshot | null = null;
let lastTextHistoryAt = 0;

function extractPositions(nodes: DiagramNode[]): CanvasPositions {
  const positionsMap: CanvasPositions = {};
  for (const node of nodes) {
    if (node.type === "group") continue;
    positionsMap[node.id] = {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    };
  }
  return positionsMap;
}

function snapshotsEqual(a: DiagramSnapshot, b: DiagramSnapshot): boolean {
  if (a.dbmlCode !== b.dbmlCode) return false;
  const aKeys = Object.keys(a.positions);
  const bKeys = Object.keys(b.positions);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const posA = a.positions[key];
    const posB = b.positions[key];
    if (!posB || posA.x !== posB.x || posA.y !== posB.y) return false;
  }
  return true;
}

const INITIAL_DBML_TEMPLATE = `// Bienvenido a Power Diagram
// Define tus tablas y relaciones en formato DBML

Table users {
  id integer [pk, increment]
  username varchar [unique, not null]
  email varchar [unique, not null]
  created_at timestamp
}

Table posts {
  id integer [pk, increment]
  user_id integer [not null]
  title varchar [not null]
  content text
  published boolean [not null]
  created_at timestamp
}

Table comments {
  id integer [pk, increment]
  post_id integer [not null]
  user_id integer [not null]
  content text [not null]
  created_at timestamp
}

Ref: posts.user_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.user_id > users.id
`;

interface DiagramState {
  // Estado del proyecto
  activeProject: Project | null;
  dbmlCode: string;
  nodes: DiagramNode[];
  edges: TableEdge[];
  syntaxError: ParserError | null;

  // Historial Undo/Redo
  past: DiagramSnapshot[];
  future: DiagramSnapshot[];

  // Estado de persistencia
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Modales e interacciones sobre el lienzo
  editingTable: TableNodeData | null;
  editingEdge: TableEdge | null;
  highlightedNodeId: string | null;

  // Contadores para disparar fitView desde acciones externas o atajos globales
  layoutVersion: number;
  centerViewVersion: number;

  // Acciones
  setActiveProject: (project: Project) => Promise<void>;
  closeProject: () => void;
  setDbmlCode: (code: string) => void;
  applyDbmlWithAutoLayout: (code: string) => Promise<void>;
  runAutoLayout: (options?: AutoLayoutOptions) => Promise<void>;
  requestCenterView: () => void;
  onNodesChange: OnNodesChange<DiagramNode>;
  onEdgesChange: OnEdgesChange<TableEdge>;
  onConnect: (connection: Connection) => void;
  addNewTable: (tableName: string, columns: ColumnData[], headerColor?: string, note?: string) => void;
  openEditTableModal: (table: TableNodeData) => void;
  closeEditTableModal: () => void;
  updateTable: (
    oldName: string,
    newName: string,
    columns: ColumnData[],
    headerColor?: string,
    note?: string
  ) => void;
  deleteTable: (tableName: string) => void;
  openEditEdgeModal: (edge: TableEdge) => void;
  closeEditEdgeModal: () => void;
  updateEdge: (
    edgeId: string,
    relationType: RelationshipType,
    onDelete?: string,
    onUpdate?: string
  ) => void;
  deleteEdge: (edgeId: string) => void;
  addEnum: (name: string, values: string[]) => void;
  deleteEnum: (name: string) => void;
  addStickyNote: (name: string, content: string) => void;
  deleteStickyNote: (name: string) => void;
  addTableGroup: (name: string, tableNames: string[], color?: string) => void;
  deleteTableGroup: (name: string) => void;
  highlightNode: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  saveToDatabase: () => Promise<void>;
  setNodes: (nodes: DiagramNode[]) => void;
  setEdges: (edges: TableEdge[]) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => {
  const scheduleAutoSave = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    set({ isDirty: true });

    if (!useSettingsStore.getState().autoSave) {
      return;
    }

    autoSaveTimer = setTimeout(() => {
      get().saveToDatabase();
    }, 600);
  };

  const captureSnapshot = (): DiagramSnapshot => ({
    dbmlCode: get().dbmlCode,
    positions: extractPositions(get().nodes),
  });

  const recordHistory = (snapshot?: DiagramSnapshot) => {
    const snap = snapshot ?? captureSnapshot();
    set((state) => {
      const last = state.past[state.past.length - 1];
      if (last && snapshotsEqual(last, snap)) {
        return { future: [] };
      }
      const nextPast = [...state.past, snap];
      if (nextPast.length > MAX_HISTORY) {
        nextPast.shift();
      }
      return { past: nextPast, future: [] };
    });
  };

  const applyDbmlDirect = (code: string) => {
    const { nodes, edges, error } = parseDbmlToGraph(code, get().nodes, {}, get().edges);
    set({
      dbmlCode: code,
      nodes,
      edges,
      syntaxError: error,
    });
    scheduleAutoSave();
  };

  return {
    activeProject: null,
    dbmlCode: "",
    nodes: [],
    edges: [],
    syntaxError: null,
    past: [],
    future: [],
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    editingTable: null,
    editingEdge: null,
    highlightedNodeId: null,
    layoutVersion: 0,
    centerViewVersion: 0,

    setActiveProject: async (project: Project) => {
      dragStartSnapshot = null;
      lastTextHistoryAt = 0;
      try {
        const diagram = await getDiagramByProjectId(project.id);
        const code =
          diagram?.dbml_code && diagram.dbml_code.trim() !== "" && diagram.dbml_code !== "// Escribe tu esquema DBML aquí\n"
            ? diagram.dbml_code
            : INITIAL_DBML_TEMPLATE;

        let savedPositions: CanvasPositions = {};
        if (diagram?.canvas_json) {
          try {
            savedPositions = JSON.parse(diagram.canvas_json);
          } catch (e) {
            console.error("Error al parsear canvas_json de SQLite:", e);
          }
        }

        const { nodes, edges, error } = parseDbmlToGraph(code, [], savedPositions);

        set({
          activeProject: project,
          dbmlCode: code,
          nodes,
          edges,
          syntaxError: error,
          past: [],
          future: [],
          editingTable: null,
          editingEdge: null,
          highlightedNodeId: null,
          isDirty: false,
          isSaving: false,
          lastSavedAt: diagram?.updated_at ? new Date(diagram.updated_at) : null,
        });

        // Si se usó la plantilla inicial por primera vez, persistirla
        if (!diagram?.dbml_code || diagram.dbml_code === "// Escribe tu esquema DBML aquí\n") {
          get().saveToDatabase();
        }
      } catch (err) {
        console.error("Error cargando diagrama del proyecto:", err);
      }
    },

    closeProject: () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      if (highlightTimer) {
        clearTimeout(highlightTimer);
        highlightTimer = null;
      }
      dragStartSnapshot = null;
      lastTextHistoryAt = 0;
      set({
        activeProject: null,
        dbmlCode: "",
        nodes: [],
        edges: [],
        syntaxError: null,
        past: [],
        future: [],
        editingTable: null,
        editingEdge: null,
        highlightedNodeId: null,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
      });
    },

    setDbmlCode: (code: string) => {
      const now = Date.now();
      if (now - lastTextHistoryAt > TEXT_HISTORY_COALESCE_MS) {
        recordHistory();
      }
      lastTextHistoryAt = now;

      applyDbmlDirect(code);
    },

    applyDbmlWithAutoLayout: async (code: string) => {
      recordHistory();
      const { layoutDirection, layoutSpacing } = useSettingsStore.getState();
      const { nodes, edges, error } = parseDbmlToGraph(code, []);
      const arrangedNodes =
        nodes.length > 0
          ? await layoutDiagramWithElk(nodes, edges, {
              direction: layoutDirection,
              spacing: layoutSpacing,
            })
          : nodes;

      set((state) => ({
        dbmlCode: code,
        nodes: arrangedNodes,
        edges,
        syntaxError: error,
        layoutVersion: state.layoutVersion + 1,
      }));

      await get().saveToDatabase();
    },

    runAutoLayout: async (options?: AutoLayoutOptions) => {
      const { nodes, edges } = get();
      if (nodes.length === 0) return;

      recordHistory();
      const { layoutDirection, layoutSpacing } = useSettingsStore.getState();
      const arrangedNodes = await layoutDiagramWithElk(nodes, edges, {
        direction: options?.direction ?? layoutDirection,
        spacing: options?.spacing ?? layoutSpacing,
      });

      set((state) => ({
        nodes: arrangedNodes,
        layoutVersion: state.layoutVersion + 1,
      }));

      scheduleAutoSave();
    },

    requestCenterView: () => {
      set((state) => ({ centerViewVersion: state.centerViewVersion + 1 }));
    },

    onNodesChange: (changes) => {
      const isDragStart = changes.some((c) => c.type === "position" && c.dragging === true);
      if (isDragStart && !dragStartSnapshot) {
        dragStartSnapshot = captureSnapshot();
      }

      let updatedNodes = applyNodeChanges(changes, get().nodes);
      const needsGroupSync = changes.some(
        (c) => c.type === "position" || c.type === "dimensions"
      );
      if (needsGroupSync) {
        updatedNodes = recomputeGroupNodes(updatedNodes);
      }

      set({ nodes: updatedNodes });

      const hasDragEnd = changes.some((c) => c.type === "position" && c.dragging === false);
      if (hasDragEnd) {
        if (dragStartSnapshot) {
          const current = {
            dbmlCode: get().dbmlCode,
            positions: extractPositions(updatedNodes),
          };
          if (!snapshotsEqual(dragStartSnapshot, current)) {
            recordHistory(dragStartSnapshot);
          }
          dragStartSnapshot = null;
        }
        scheduleAutoSave();
      }
    },

    onEdgesChange: (changes) => {
      // Manejar la eliminación de relaciones (Supr o Backspace sobre la arista)
      const removedChanges = changes.filter((c) => c.type === "remove");
      if (removedChanges.length > 0) {
        let currentCode = get().dbmlCode;
        let changed = false;
        for (const change of removedChanges) {
          const edge = get().edges.find((e) => e.id === change.id);
          if (edge) {
            const sourceTable = edge.source;
            const targetTable = edge.target;
            const sourceCol =
              (edge.data?.sourceColumn as string) ||
              (edge.sourceHandle ? edge.sourceHandle.replace(/-source|-target/, "") : "");
            const targetCol =
              (edge.data?.targetColumn as string) ||
              (edge.targetHandle ? edge.targetHandle.replace(/-source|-target/, "") : "");

            if (sourceTable && targetTable && sourceCol && targetCol) {
              if (!changed) {
                recordHistory();
                changed = true;
              }
              currentCode = removeRefFromDbml(
                currentCode,
                sourceTable,
                sourceCol,
                targetTable,
                targetCol
              );
            }
          }
        }
        if (changed) {
          applyDbmlDirect(currentCode);
        }
        return;
      }

      const updatedEdges = applyEdgeChanges(changes, get().edges);
      set({ edges: updatedEdges });
    },

    openEditEdgeModal: (edge) => {
      set({ editingEdge: edge });
    },

    closeEditEdgeModal: () => {
      set({ editingEdge: null });
    },

    updateEdge: (edgeId, relationType, onDelete, onUpdate) => {
      const edge = get().edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const sourceTable = edge.source;
      const targetTable = edge.target;
      const sourceCol =
        (edge.data?.sourceColumn as string) ||
        (edge.sourceHandle ? edge.sourceHandle.replace(/-source|-target/, "") : "");
      const targetCol =
        (edge.data?.targetColumn as string) ||
        (edge.targetHandle ? edge.targetHandle.replace(/-source|-target/, "") : "");

      if (!sourceTable || !targetTable || !sourceCol || !targetCol) return;

      recordHistory();
      const updatedDbml = updateRefInDbml(
        get().dbmlCode,
        sourceTable,
        sourceCol,
        targetTable,
        targetCol,
        relationType,
        onDelete,
        onUpdate
      );
      applyDbmlDirect(updatedDbml);
      set({ editingEdge: null });
    },

    deleteEdge: (edgeId: string) => {
      const edge = get().edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const sourceTable = edge.source;
      const targetTable = edge.target;
      const sourceCol =
        (edge.data?.sourceColumn as string) ||
        (edge.sourceHandle ? edge.sourceHandle.replace(/-source|-target/, "") : "");
      const targetCol =
        (edge.data?.targetColumn as string) ||
        (edge.targetHandle ? edge.targetHandle.replace(/-source|-target/, "") : "");

      if (sourceTable && targetTable && sourceCol && targetCol) {
        recordHistory();
        const updatedDbml = removeRefFromDbml(
          get().dbmlCode,
          sourceTable,
          sourceCol,
          targetTable,
          targetCol
        );
        applyDbmlDirect(updatedDbml);
        if (get().editingEdge?.id === edgeId) {
          set({ editingEdge: null });
        }
      }
    },

    onConnect: (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return;

      const sourceCol = sourceHandle.replace(/-source|-target/, "");
      const targetCol = targetHandle.replace(/-source|-target/, "");

      recordHistory();
      const newDbml = appendRefToDbml(
        get().dbmlCode,
        source,
        sourceCol,
        target,
        targetCol,
        ">"
      );

      applyDbmlDirect(newDbml);
    },

    addNewTable: (tableName, columns, headerColor, note) => {
      recordHistory();
      const newDbml = appendTableToDbml(get().dbmlCode, tableName, columns, headerColor, note);
      applyDbmlDirect(newDbml);
    },

    openEditTableModal: (table) => {
      set({ editingTable: table });
    },

    closeEditTableModal: () => {
      set({ editingTable: null });
    },

    updateTable: (oldName, newName, columns, headerColor, note) => {
      recordHistory();
      const updatedDbml = updateTableInDbml(
        get().dbmlCode,
        oldName,
        newName,
        columns,
        headerColor,
        note
      );
      applyDbmlDirect(updatedDbml);
      set({ editingTable: null });
    },

    deleteTable: (tableName) => {
      recordHistory();
      const updatedDbml = removeTableFromDbml(get().dbmlCode, tableName);
      applyDbmlDirect(updatedDbml);
      set({ editingTable: null });
    },

    addEnum: (name, values) => {
      recordHistory();
      const updatedDbml = appendEnumToDbml(get().dbmlCode, name, values);
      applyDbmlDirect(updatedDbml);
    },

    deleteEnum: (name) => {
      recordHistory();
      const updatedDbml = removeEnumFromDbml(get().dbmlCode, name);
      applyDbmlDirect(updatedDbml);
    },

    addStickyNote: (name, content) => {
      recordHistory();
      const updatedDbml = appendStickyNoteToDbml(get().dbmlCode, name, content);
      applyDbmlDirect(updatedDbml);
    },

    deleteStickyNote: (name) => {
      recordHistory();
      const updatedDbml = removeStickyNoteFromDbml(get().dbmlCode, name);
      applyDbmlDirect(updatedDbml);
    },

    addTableGroup: (name, tableNames, color) => {
      recordHistory();
      const updatedDbml = appendTableGroupToDbml(get().dbmlCode, name, tableNames, color);
      applyDbmlDirect(updatedDbml);
    },

    deleteTableGroup: (name) => {
      recordHistory();
      const updatedDbml = removeTableGroupFromDbml(get().dbmlCode, name);
      applyDbmlDirect(updatedDbml);
    },

    highlightNode: (nodeId: string) => {
      if (highlightTimer) {
        clearTimeout(highlightTimer);
      }
      set({ highlightedNodeId: nodeId });
      highlightTimer = setTimeout(() => {
        set({ highlightedNodeId: null });
        highlightTimer = null;
      }, 1800);
    },

    undo: () => {
      const { past, future, dbmlCode, nodes } = get();
      if (past.length === 0) return;

      const target = past[past.length - 1];
      const nextPast = past.slice(0, -1);
      const currentSnapshot: DiagramSnapshot = {
        dbmlCode,
        positions: extractPositions(nodes),
      };

      const { nodes: parsedNodes, edges, error } = parseDbmlToGraph(
        target.dbmlCode,
        [],
        target.positions
      );

      lastTextHistoryAt = 0;
      dragStartSnapshot = null;

      set({
        dbmlCode: target.dbmlCode,
        nodes: parsedNodes,
        edges,
        syntaxError: error,
        past: nextPast,
        future: [currentSnapshot, ...future].slice(0, MAX_HISTORY),
        editingTable: null,
        editingEdge: null,
      });

      scheduleAutoSave();
    },

    redo: () => {
      const { past, future, dbmlCode, nodes } = get();
      if (future.length === 0) return;

      const [target, ...restFuture] = future;
      const currentSnapshot: DiagramSnapshot = {
        dbmlCode,
        positions: extractPositions(nodes),
      };

      const { nodes: parsedNodes, edges, error } = parseDbmlToGraph(
        target.dbmlCode,
        [],
        target.positions
      );

      lastTextHistoryAt = 0;
      dragStartSnapshot = null;

      set({
        dbmlCode: target.dbmlCode,
        nodes: parsedNodes,
        edges,
        syntaxError: error,
        past: [...past, currentSnapshot].slice(-MAX_HISTORY),
        future: restFuture,
        editingTable: null,
        editingEdge: null,
      });

      scheduleAutoSave();
    },

    saveToDatabase: async () => {
      const { activeProject, dbmlCode, nodes } = get();
      if (!activeProject) return;

      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }

      set({ isSaving: true });

      try {
        const positionsMap = extractPositions(nodes);
        const canvasJson = JSON.stringify(positionsMap);
        await saveDiagramState(activeProject.id, dbmlCode, canvasJson);

        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date(),
        });
      } catch (err) {
        console.error("Error al autoguardar el diagrama:", err);
        set({ isSaving: false });
      }
    },

    setNodes: (nodes: DiagramNode[]) => set({ nodes }),
    setEdges: (edges: TableEdge[]) => set({ edges }),
  };
});

// Sincronizar cambios en la preferencia de autoguardado con el estado pendiente del diagrama
useSettingsStore.subscribe((state, prevState) => {
  if (state.autoSave === prevState.autoSave) return;

  if (state.autoSave) {
    const { activeProject, isDirty, isSaving, saveToDatabase } = useDiagramStore.getState();
    if (activeProject && isDirty && !isSaving) {
      void saveToDatabase();
    }
  } else if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
});
