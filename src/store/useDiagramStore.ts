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
  appendTableToDbml,
  appendRefToDbml,
  type TableNode,
  type TableEdge,
  type ParserError,
  type ColumnData,
  type CanvasPositions,
} from "@/lib/dbmlParser";
import {
  type Project,
  getDiagramByProjectId,
  saveDiagramState,
} from "@/db/database";

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

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
  nodes: TableNode[];
  edges: TableEdge[];
  syntaxError: ParserError | null;

  // Estado de persistencia
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Acciones
  setActiveProject: (project: Project) => Promise<void>;
  closeProject: () => void;
  setDbmlCode: (code: string) => void;
  onNodesChange: OnNodesChange<TableNode>;
  onEdgesChange: OnEdgesChange<TableEdge>;
  onConnect: (connection: Connection) => void;
  addNewTable: (tableName: string, columns: ColumnData[]) => void;
  saveToDatabase: () => Promise<void>;
  setNodes: (nodes: TableNode[]) => void;
  setEdges: (edges: TableEdge[]) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => {
  const scheduleAutoSave = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    set({ isDirty: true });

    autoSaveTimer = setTimeout(() => {
      get().saveToDatabase();
    }, 600);
  };

  return {
    activeProject: null,
    dbmlCode: "",
    nodes: [],
    edges: [],
    syntaxError: null,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,

    setActiveProject: async (project: Project) => {
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
      }
      set({
        activeProject: null,
        dbmlCode: "",
        nodes: [],
        edges: [],
        syntaxError: null,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
      });
    },

    setDbmlCode: (code: string) => {
      const { nodes, edges, error } = parseDbmlToGraph(code, get().nodes);

      set({
        dbmlCode: code,
        nodes,
        edges,
        syntaxError: error,
      });

      scheduleAutoSave();
    },

    onNodesChange: (changes) => {
      const updatedNodes = applyNodeChanges(changes, get().nodes);
      set({ nodes: updatedNodes });

      // Si el cambio involucra movimiento o arrastre de nodos, disparar autoguardado
      const hasSpatialChange = changes.some(
        (c) => c.type === "position" && c.dragging === false
      );

      if (hasSpatialChange) {
        scheduleAutoSave();
      }
    },

    onEdgesChange: (changes) => {
      const updatedEdges = applyEdgeChanges(changes, get().edges);
      set({ edges: updatedEdges });
    },

    onConnect: (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return;

      const sourceCol = sourceHandle.replace(/-source|-target/, "");
      const targetCol = targetHandle.replace(/-source|-target/, "");

      // Inyectar quirúrgicamente la relación al código DBML
      const newDbml = appendRefToDbml(
        get().dbmlCode,
        source,
        sourceCol,
        target,
        targetCol,
        ">"
      );

      get().setDbmlCode(newDbml);
    },

    addNewTable: (tableName: string, columns: ColumnData[]) => {
      const newDbml = appendTableToDbml(get().dbmlCode, tableName, columns);
      get().setDbmlCode(newDbml);
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
        // Serializar las posiciones espaciales de los nodos
        const positionsMap: CanvasPositions = {};
        for (const node of nodes) {
          positionsMap[node.id] = {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
          };
        }

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

    setNodes: (nodes: TableNode[]) => set({ nodes }),
    setEdges: (edges: TableEdge[]) => set({ edges }),
  };
});

