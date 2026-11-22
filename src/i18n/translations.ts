import type { AccentColorId } from "@/config/themes";

export type AppLanguage = "es" | "en";
export type UpcomingLanguage = "pt" | "fr";
export type AnyLanguageId = AppLanguage | UpcomingLanguage;

export interface LanguageOption {
  id: AnyLanguageId;
  code: string;
  nativeName: string;
  labels: Record<AppLanguage, string>;
  available: boolean;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    id: "es",
    code: "ES",
    nativeName: "Español",
    labels: { es: "Español", en: "Spanish" },
    available: true,
  },
  {
    id: "en",
    code: "EN",
    nativeName: "English",
    labels: { es: "Inglés", en: "English" },
    available: true,
  },
  {
    id: "pt",
    code: "PT",
    nativeName: "Português",
    labels: { es: "Portugués", en: "Portuguese" },
    available: false,
  },
  {
    id: "fr",
    code: "FR",
    nativeName: "Français",
    labels: { es: "Francés", en: "French" },
    available: false,
  },
] as const;

const es = {
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    saveChanges: "Guardar Cambios",
    saving: "Guardando...",
    delete: "Eliminar",
    deleting: "Eliminando...",
    copied: "Copiado",
    copy: "Copiar",
    close: "Cerrar",
    active: "Activo",
    disabled: "Desactivado",
    comingSoon: "Próximamente",
  },
  dashboard: {
    tagline: "ERD Studio & SQL Architect",
    title: "Mis Bases de Datos",
    subtitle: "Administra tus diagramas relacionales, esquemas DBML y arquitecturas de datos.",
    quickAccessTitle: "Nuevo y Recientes",
    newDatabaseTitle: "Nueva Base de Datos",
    newDatabaseSubtitle: "Diseñar nuevo esquema ERD",
    recentBadge: "Reciente",
    registeredProjectsTitle: (count: number) => `Proyectos Registrados (${count})`,
    loadingProjects: "Cargando proyectos desde SQLite...",
    emptyTitle: "No hay proyectos registrados todavía",
    emptySubtitle: "Crea tu primera base de datos usando el botón superior.",
    open: "Abrir",
    editProjectTitle: "Editar proyecto",
    deleteProjectTitle: "Eliminar proyecto",
    deleteModalTitle: "Eliminar Base de Datos",
    deleteModalDescription: (name: string) =>
      `¿Estás seguro de que deseas eliminar "${name}" y su diagrama? Esta acción no se puede deshacer.`,
    viewModeLabel: "Formato de vista",
    viewGrid: "Vista de cuadrícula",
    viewList: "Vista de lista",
    viewTable: "Vista de tabla",
    tableColProject: "Proyecto",
    tableColEngine: "Motor",
    tableColCreated: "Creado",
    tableColActions: "Acciones",
  },
  optionsMenu: {
    optionsTitle: "Opciones",
    optionsAria: "Opciones del dashboard",
    colorMode: "Cambio de color",
    light: "Claro",
    dark: "Oscuro",
    preferences: "Preferencias",
  },
  preferences: {
    srDescription: "Preferencias de Power Diagram",
    title: "Preferencias",
    navAria: "Categorías de preferencias",
    footerNote: "Personalización y configuración general.",
    tabs: {
      customize: "Personalizar",
      settings: "Configuración",
      about: "Acerca de",
    },
    customize: {
      title: "Personalización",
      description:
        "Ajusta el modo de apariencia y el color general de acento aplicado a los botones, enlaces y efectos visuales de la aplicación.",
      appearanceModeTitle: "Modo de Apariencia",
      themes: {
        light: {
          label: "Claro",
          description: "Fondo blanco limpio para entornos iluminados",
        },
        dark: {
          label: "Oscuro",
          description: "Tonos oscuros relajantes para reducir la fatiga visual",
        },
        system: {
          label: "Sistema",
          description: "Sincronizado con la preferencia del sistema operativo",
        },
      },
      accentColorTitle: "Color General de la App",
      availableColors: (count: number) => `${count} colores disponibles`,
      accentColorDescription:
        "Configura el color principal de los botones de acción, estados seleccionados y efectos de hover en toda la interfaz.",
      accents: {
        indigo: { label: "Índigo", description: "Púrpura azulado clásico predeterminado" },
        blue: { label: "Azul Océano", description: "Azul nítido y profesional" },
        emerald: { label: "Esmeralda", description: "Verde fresco y equilibrado" },
        cyan: { label: "Cian", description: "Turquesa eléctrico y moderno" },
        violet: { label: "Violeta", description: "Púrpura profundo y vibrante" },
        rose: { label: "Rosa", description: "Carmesí llamativo y enérgico" },
        amber: { label: "Ámbar", description: "Naranja cálido y dorado" },
        teal: { label: "Teal", description: "Verde azulado equilibrado" },
        monochrome: {
          label: "Monocromo",
          description: "Oscuro en modo claro / Blanco en modo oscuro",
        },
      } satisfies Record<AccentColorId, { label: string; description: string }>,
    },
    settings: {
      title: "Configuración",
      description:
        "Administra el comportamiento de guardado de tus diagramas y el idioma general de la interfaz.",
      autoSaveSectionTitle: "Persistencia y Guardado",
      autoSaveLabel: "Autoguardado",
      autoSaveDescription:
        "Guarda automáticamente en SQLite cada edición en el código DBML o movimiento de tablas. Si lo desactivas, podrás guardar manualmente con el botón Guardar o Ctrl + S.",
      autoSaveSwitchAria: "Habilitar o deshabilitar autoguardado",
      languageSectionTitle: "Idioma del Sistema",
      languageDescription:
        "Selecciona el idioma de la interfaz de la aplicación. Estamos trabajando para añadir soporte a más idiomas.",
      languageActive: "Seleccionado",
    },
    about: {
      openSourceBadge: (license: string) => `Open Source · ${license}`,
      copyrightTitle: "Copyright y Titular",
      brandTitle: "Marca",
      independentAuthor: "Autor independiente (por definir)",
      contactEmailTitle: "Correo de contacto",
      emailPending: "Disponible próximamente al definir marca",
      repositoryTitle: "Repositorio oficial",
      showMit: "Ver texto completo de Licencia MIT",
      hideMit: "Ocultar texto de Licencia MIT",
      privacyTitle: "Política de Privacidad Local",
      offlineBadge: "100 % Offline-First",
      privacyItems: [
        {
          title: "Cero telemetría y cero cuentas",
          description:
            "Power Diagram no recopila datos personales, métricas de uso, analítica ni reportes automáticos.",
        },
        {
          title: "Almacenamiento estrictamente local",
          description:
            "Tus proyectos, diagramas DBML/SQL y estado de ventana se guardan únicamente en tu equipo (erd_studio.db y window-state.json dentro de la carpeta de configuración de tu sistema operativo).",
        },
        {
          title: "Sin envío de esquemas a servidores externos",
          description:
            "Todo el parseo DBML, layout automático y generación de scripts DDL se ejecuta offline dentro de tu dispositivo.",
        },
      ],
      disclaimerTitle: "Exención de Responsabilidad y Aviso de Marcas",
      disclaimerParagraphs: [
        "Este software se proporciona «tal cual» («AS IS»), sin garantías expresas ni implícitas de ningún tipo, conforme a la Licencia MIT.",
        "Los scripts DDL SQL y esquemas exportados deben ser revisados y validados por el usuario antes de ejecutarse en bases de datos de producción. El autor no asume responsabilidad por pérdida de datos o daños derivados del uso del software.",
        "Los nombres y logotipos de PostgreSQL, MySQL, SQLite y SQL Server se utilizan de forma exclusivamente nominativa para identificar dialectos compatibles. Power Diagram no está afiliado, patrocinado ni respaldado por PostgreSQL Global Development Group, Oracle Corporation, SQLite Consortium / Hwaci ni Microsoft Corporation.",
      ],
      thirdPartyTitle: "Licencias de Terceros",
      searchLicensesPlaceholder: "Buscar librería o licencia...",
      noLicensesFound: (query: string) => `No se encontraron librerías para «${query}».`,
      layers: {
        Frontend: "Frontend",
        "Backend (Rust)": "Backend (Rust)",
        Tipografía: "Tipografía",
      },
    },
  },
  workspace: {
    backToProjects: "Proyectos",
    backToProjectsTitle: "Volver a la lista de proyectos",
    statusSaving: "Guardando cambios...",
    statusUnsaved: "Cambios sin guardar (clic para guardar)",
    statusSaved: "Guardado en SQLite",
    exportSql: "Exportar SQL",
    exportSqlTitle: "Exportar esquema a SQL nativo o JSON",
    importSql: "Importar SQL",
    importSqlTitle: "Importar script SQL existente (Ingeniería inversa)",
    exportPngTitle: "Exportar diagrama como imagen PNG de alta resolución",
    exportingPng: "Exportando...",
    exportedPng: "Guardado",
    newTable: "Nueva Tabla",
    newTableTitle: "Crear tabla visualmente",
    saveBtnTitle: "Guardar cambios en SQLite (Ctrl + S)",
    saveOptionsTitle: "Opciones de guardado",
    autoSaveToggleLabel: "Autoguardado",
    autoSaveOn: "Activo",
    autoSaveOff: "Inactivo",
    openSaveSettings: "Configuración...",
    preferencesTitle: "Preferencias y Configuración",
    hideEditor: "Ocultar Editor",
    showEditor: "Abrir Editor",
    hideEditorTitle: "Ocultar editor de código",
    showEditorTitle: "Mostrar editor de código",
    resizeHandleTitle: "Arrastra para ajustar el ancho (Doble clic para restaurar)",
    unsavedExitTitle: "Cambios sin guardar",
    unsavedExitDescription:
      "Tienes cambios pendientes por guardar porque el autoguardado está deshabilitado. Si sales ahora, se perderán los últimos cambios realizados.",
    unsavedExitConfirm: "Salir sin guardar",
    unsavedExitCancel: "Seguir editando",
  },
  editor: {
    title: "Editor DBML",
    counts: (tables: number, relations: number) =>
      `(${tables} ${tables === 1 ? "tabla" : "tablas"}, ${relations} ${relations === 1 ? "relación" : "relaciones"})`,
    copyTitle: "Copiar código DBML al portapapeles",
    syntaxErrorPrefix: (line?: number) =>
      `Error sintáctico${line ? ` (Línea ${line})` : ""}:`,
  },
  canvas: {
    zoomTooltip: (percent: number) =>
      `Zoom aplicado: ${percent}% (Clic para restablecer al 100%)`,
    autoLayout: "Auto-Ordenar",
    autoLayoutTitle: "Auto-organizar tablas matemáticamente para evitar cruce de líneas",
    centerView: "Centrar",
    centerViewTitle: "Ajustar vista a todas las tablas",
    colsCount: (count: number) => `${count} cols`,
    editTableTooltip: "Editar características de la tabla",
    noColumns: "Sin columnas definidas",
    relationTooltip: (type: string) => `Relación ${type} (Clic para eliminar)`,
    deleteRelationTooltip: "Eliminar relación",
  },
  themeToggle: {
    switchToLight: "Cambiar a Modo Claro",
    switchToDark: "Cambiar a Modo Oscuro",
  },
  modals: {
    projectForm: {
      nameLabel: "Nombre del Proyecto / Base de Datos",
      namePlaceholder: "ej. Sistema de Facturación, E-commerce, CRM Ventas",
      engineLabel: "Motor de Base de Datos",
      editNamePlaceholder: "Nombre del proyecto",
    },
    createProject: {
      title: "Crear Nuevo Proyecto ERD",
      description:
        "Define el nombre y el motor para inicializar tu nuevo esquema de base de datos.",
      submit: "Crear Proyecto",
      submitting: "Creando...",
    },
    editProject: {
      title: "Editar Base de Datos",
      description:
        "Modifica el nombre o el motor asignado a tu proyecto de base de datos.",
    },
    tableModal: {
      createTitle: "Crear Nueva Tabla Visualmente",
      createDescription:
        "Define el nombre, color de encabezado y columnas. La tabla se inyectará de forma quirúrgica en el código DBML y en el lienzo.",
      createSubmit: "Crear Tabla",
      editTitlePrefix: "Editar Tabla:",
      editDescription:
        "Modifica el nombre, color de acento, descripción y columnas. Todos los cambios se reflejarán en el código DBML y el lienzo automáticamente.",
      tableNameLabel: "Nombre de la Tabla",
      tableNamePlaceholder: "ej. clientes, facturas, productos",
      editTableNamePlaceholder: "Nombre de la tabla",
      accentColorLabel: "Color de Acento",
      noteLabel: "Descripción / Nota (Opcional)",
      notePlaceholder: "ej. Almacena las publicaciones principales creadas por los usuarios",
      columnsTitle: (count: number) => `Columnas / Campos (${count})`,
      addColumn: "Agregar Columna",
      colHeaderName: "Nombre de Columna",
      colHeaderType: "Tipo SQL",
      colHeaderConstraints: "Restricciones",
      colHeaderDelete: "Borrar",
      colNamePlaceholder: "Nombre campo (ej. email)",
      editColNamePlaceholder: "Nombre campo",
      deleteColumnTitle: "Eliminar columna",
      deleteTableBtn: "Eliminar Tabla",
      deleteTableConfirmTitle: "Eliminar Tabla",
      deleteTableConfirmDescription: (name: string) =>
        `¿Estás seguro de que deseas eliminar la tabla "${name}" y todas sus relaciones del diagrama?`,
    },
    sqlExchange: {
      title: "Intercambio SQL y Esquemas DDL",
      description:
        "Exporta tu arquitectura a scripts SQL nativos o importa esquemas existentes mediante ingeniería inversa.",
      exportTab: "Exportar SQL",
      importTab: "Importar SQL",
      dbEngineLabel: "Motor de Base de Datos:",
      copySql: "Copiar SQL",
      downloadPrefix: "Descargar",
      sourceDialectLabel: "Dialecto de Origen:",
      autoDetectedTooltip: (dialect: string) =>
        `Dialecto detectado automáticamente: ${dialect}`,
      loadSqlFile: "Cargar archivo .sql",
      modeReplace: "Reemplazar",
      modeAppend: "Añadir",
      sqlPlaceholder:
        "Pega aquí tu script o dump SQL completo (se extraerán automáticamente solo CREATE TABLE y sus relaciones, ignorando configuraciones y datos)...",
      readySummary: (tables: number, relations: number) =>
        `Listo: ${tables} ${tables === 1 ? "tabla" : "tablas"} y ${relations} ${relations === 1 ? "relación" : "relaciones"}`,
      ignoredSummary: (count: number) =>
        `· Se ignoraron ${count} ${count === 1 ? "sentencia ajena al esquema" : "sentencias ajenas al esquema"}`,
      skippedDuplicates: (count: number) =>
        `Se omitirán ${count} ${count === 1 ? "tabla que ya existe" : "tablas que ya existen"} en el diagrama:`,
      importingStatus: "Organizando diagrama...",
      importSubmit: "Convertir a Diagrama DBML",
    },
  },
};

type DeepWiden<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends ReadonlyArray<infer U>
      ? readonly DeepWiden<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepWiden<T[K]> }
        : T;

export type Translations = DeepWiden<typeof es>;

const en: Translations = {
  common: {
    cancel: "Cancel",
    save: "Save",
    saveChanges: "Save Changes",
    saving: "Saving...",
    delete: "Delete",
    deleting: "Deleting...",
    copied: "Copied",
    copy: "Copy",
    close: "Close",
    active: "Active",
    disabled: "Disabled",
    comingSoon: "Coming soon",
  },
  dashboard: {
    tagline: "ERD Studio & SQL Architect",
    title: "My Databases",
    subtitle: "Manage your relational diagrams, DBML schemas, and data architectures.",
    quickAccessTitle: "New & Recent",
    newDatabaseTitle: "New Database",
    newDatabaseSubtitle: "Design a new ERD schema",
    recentBadge: "Recent",
    registeredProjectsTitle: (count: number) => `Registered Projects (${count})`,
    loadingProjects: "Loading projects from SQLite...",
    emptyTitle: "No projects registered yet",
    emptySubtitle: "Create your first database using the button above.",
    open: "Open",
    editProjectTitle: "Edit project",
    deleteProjectTitle: "Delete project",
    deleteModalTitle: "Delete Database",
    deleteModalDescription: (name: string) =>
      `Are you sure you want to delete "${name}" and its diagram? This action cannot be undone.`,
    viewModeLabel: "View layout",
    viewGrid: "Grid view",
    viewList: "List view",
    viewTable: "Table view",
    tableColProject: "Project",
    tableColEngine: "Engine",
    tableColCreated: "Created",
    tableColActions: "Actions",
  },
  optionsMenu: {
    optionsTitle: "Options",
    optionsAria: "Dashboard options",
    colorMode: "Theme",
    light: "Light",
    dark: "Dark",
    preferences: "Preferences",
  },
  preferences: {
    srDescription: "Power Diagram Preferences",
    title: "Preferences",
    navAria: "Preferences categories",
    footerNote: "Customization and general settings.",
    tabs: {
      customize: "Customize",
      settings: "Settings",
      about: "About",
    },
    customize: {
      title: "Customization",
      description:
        "Adjust the appearance mode and general accent color applied to buttons, links, and visual effects across the application.",
      appearanceModeTitle: "Appearance Mode",
      themes: {
        light: {
          label: "Light",
          description: "Clean light background for bright environments",
        },
        dark: {
          label: "Dark",
          description: "Relaxing dark tones to reduce eye strain",
        },
        system: {
          label: "System",
          description: "Synced with your operating system preference",
        },
      },
      accentColorTitle: "App Accent Color",
      availableColors: (count: number) => `${count} available colors`,
      accentColorDescription:
        "Set the primary color for action buttons, selected states, and hover effects throughout the interface.",
      accents: {
        indigo: { label: "Indigo", description: "Classic default bluish purple" },
        blue: { label: "Ocean Blue", description: "Crisp and professional blue" },
        emerald: { label: "Emerald", description: "Fresh and balanced green" },
        cyan: { label: "Cyan", description: "Electric and modern turquoise" },
        violet: { label: "Violet", description: "Deep and vibrant purple" },
        rose: { label: "Rose", description: "Bold and energetic crimson" },
        amber: { label: "Amber", description: "Warm and golden orange" },
        teal: { label: "Teal", description: "Balanced blue-green" },
        monochrome: {
          label: "Monochrome",
          description: "Dark in light mode / White in dark mode",
        },
      },
    },
    settings: {
      title: "Settings",
      description:
        "Manage how your diagrams are persisted and configure the interface language.",
      autoSaveSectionTitle: "Persistence & Saving",
      autoSaveLabel: "Auto-Save",
      autoSaveDescription:
        "Automatically saves every DBML code edit or table movement to SQLite. When disabled, you can save manually using the Save button or Ctrl + S.",
      autoSaveSwitchAria: "Enable or disable auto-save",
      languageSectionTitle: "System Language",
      languageDescription:
        "Select the primary application interface language. Support for additional languages is coming soon.",
      languageActive: "Selected",
    },
    about: {
      openSourceBadge: (license: string) => `Open Source · ${license}`,
      copyrightTitle: "Copyright & Owner",
      brandTitle: "Brand",
      independentAuthor: "Independent author (TBD)",
      contactEmailTitle: "Contact email",
      emailPending: "Available soon once brand is defined",
      repositoryTitle: "Official repository",
      showMit: "View full MIT License text",
      hideMit: "Hide MIT License text",
      privacyTitle: "Local Privacy Policy",
      offlineBadge: "100% Offline-First",
      privacyItems: [
        {
          title: "Zero telemetry and zero accounts",
          description:
            "Power Diagram does not collect personal data, usage metrics, analytics, or automated reports.",
        },
        {
          title: "Strictly local storage",
          description:
            "Your projects, DBML/SQL diagrams, and window state are stored solely on your machine (erd_studio.db and window-state.json inside your OS configuration directory).",
        },
        {
          title: "No schemas sent to external servers",
          description:
            "All DBML parsing, automatic layout, and DDL script generation run completely offline on your device.",
        },
      ],
      disclaimerTitle: "Disclaimer & Trademarks Notice",
      disclaimerParagraphs: [
        'This software is provided "AS IS", without warranties of any kind, express or implied, in accordance with the MIT License.',
        "Exported SQL DDL scripts and schemas must be reviewed and validated by the user before running them against production databases. The author assumes no responsibility for data loss or damages resulting from software use.",
        "PostgreSQL, MySQL, SQLite, and SQL Server names and logos are used purely for nominative identification of supported dialects. Power Diagram is not affiliated with, sponsored by, or endorsed by the PostgreSQL Global Development Group, Oracle Corporation, SQLite Consortium / Hwaci, or Microsoft Corporation.",
      ],
      thirdPartyTitle: "Third-Party Licenses",
      searchLicensesPlaceholder: "Search library or license...",
      noLicensesFound: (query: string) => `No libraries found for "${query}".`,
      layers: {
        Frontend: "Frontend",
        "Backend (Rust)": "Backend (Rust)",
        Tipografía: "Typography",
      },
    },
  },
  workspace: {
    backToProjects: "Projects",
    backToProjectsTitle: "Back to projects list",
    statusSaving: "Saving changes...",
    statusUnsaved: "Unsaved changes (click to save)",
    statusSaved: "Saved to SQLite",
    exportSql: "Export SQL",
    exportSqlTitle: "Export schema to native SQL or JSON",
    importSql: "Import SQL",
    importSqlTitle: "Import existing SQL script (Reverse engineering)",
    exportPngTitle: "Export diagram as high-resolution PNG image",
    exportingPng: "Exporting...",
    exportedPng: "Saved",
    newTable: "New Table",
    newTableTitle: "Create table visually",
    saveBtnTitle: "Save changes to SQLite (Ctrl + S)",
    saveOptionsTitle: "Save options",
    autoSaveToggleLabel: "Auto-save",
    autoSaveOn: "Enabled",
    autoSaveOff: "Disabled",
    openSaveSettings: "Settings...",
    preferencesTitle: "Preferences & Settings",
    hideEditor: "Hide Editor",
    showEditor: "Open Editor",
    hideEditorTitle: "Hide code editor",
    showEditorTitle: "Show code editor",
    resizeHandleTitle: "Drag to resize width (Double click to reset)",
    unsavedExitTitle: "Unsaved changes",
    unsavedExitDescription:
      "You have pending changes because auto-save is disabled. If you leave now, your latest edits will be lost.",
    unsavedExitConfirm: "Leave without saving",
    unsavedExitCancel: "Keep editing",
  },
  editor: {
    title: "DBML Editor",
    counts: (tables: number, relations: number) =>
      `(${tables} ${tables === 1 ? "table" : "tables"}, ${relations} ${relations === 1 ? "relation" : "relations"})`,
    copyTitle: "Copy DBML code to clipboard",
    syntaxErrorPrefix: (line?: number) =>
      `Syntax error${line ? ` (Line ${line})` : ""}:`,
  },
  canvas: {
    zoomTooltip: (percent: number) =>
      `Zoom level: ${percent}% (Click to reset to 100%)`,
    autoLayout: "Auto-Arrange",
    autoLayoutTitle: "Automatically arrange tables mathematically to minimize line crossings",
    centerView: "Center",
    centerViewTitle: "Fit view to all tables",
    colsCount: (count: number) => `${count} cols`,
    editTableTooltip: "Edit table properties",
    noColumns: "No columns defined",
    relationTooltip: (type: string) => `Relation ${type} (Click to delete)`,
    deleteRelationTooltip: "Delete relation",
  },
  themeToggle: {
    switchToLight: "Switch to Light Mode",
    switchToDark: "Switch to Dark Mode",
  },
  modals: {
    projectForm: {
      nameLabel: "Project / Database Name",
      namePlaceholder: "e.g. Billing System, E-commerce, Sales CRM",
      engineLabel: "Database Engine",
      editNamePlaceholder: "Project name",
    },
    createProject: {
      title: "Create New ERD Project",
      description:
        "Define the name and engine to initialize your new database schema.",
      submit: "Create Project",
      submitting: "Creating...",
    },
    editProject: {
      title: "Edit Database",
      description: "Modify the name or engine assigned to your database project.",
    },
    tableModal: {
      createTitle: "Create New Table Visually",
      createDescription:
        "Define the name, header color, and columns. The table will be cleanly injected into your DBML code and canvas.",
      createSubmit: "Create Table",
      editTitlePrefix: "Edit Table:",
      editDescription:
        "Modify the name, accent color, description, and columns. All changes automatically reflect in the DBML code and canvas.",
      tableNameLabel: "Table Name",
      tableNamePlaceholder: "e.g. customers, invoices, products",
      editTableNamePlaceholder: "Table name",
      accentColorLabel: "Accent Color",
      noteLabel: "Description / Note (Optional)",
      notePlaceholder: "e.g. Stores primary posts created by users",
      columnsTitle: (count: number) => `Columns / Fields (${count})`,
      addColumn: "Add Column",
      colHeaderName: "Column Name",
      colHeaderType: "SQL Type",
      colHeaderConstraints: "Constraints",
      colHeaderDelete: "Delete",
      colNamePlaceholder: "Field name (e.g. email)",
      editColNamePlaceholder: "Field name",
      deleteColumnTitle: "Delete column",
      deleteTableBtn: "Delete Table",
      deleteTableConfirmTitle: "Delete Table",
      deleteTableConfirmDescription: (name: string) =>
        `Are you sure you want to delete table "${name}" and all its relationships from the diagram?`,
    },
    sqlExchange: {
      title: "SQL Exchange & DDL Schemas",
      description:
        "Export your architecture to native SQL scripts or import existing schemas via reverse engineering.",
      exportTab: "Export SQL",
      importTab: "Import SQL",
      dbEngineLabel: "Database Engine:",
      copySql: "Copy SQL",
      downloadPrefix: "Download",
      sourceDialectLabel: "Source Dialect:",
      autoDetectedTooltip: (dialect: string) =>
        `Auto-detected dialect: ${dialect}`,
      loadSqlFile: "Load .sql file",
      modeReplace: "Replace",
      modeAppend: "Append",
      sqlPlaceholder:
        "Paste your full SQL script or dump here (only CREATE TABLE statements and relationships will be extracted automatically, ignoring configs and data)...",
      readySummary: (tables: number, relations: number) =>
        `Ready: ${tables} ${tables === 1 ? "table" : "tables"} and ${relations} ${relations === 1 ? "relation" : "relations"}`,
      ignoredSummary: (count: number) =>
        `· Ignored ${count} non-schema ${count === 1 ? "statement" : "statements"}`,
      skippedDuplicates: (count: number) =>
        `Skipping ${count} existing ${count === 1 ? "table" : "tables"} in the diagram:`,
      importingStatus: "Arranging diagram...",
      importSubmit: "Convert to DBML Diagram",
    },
  },
};

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  es,
  en,
};
