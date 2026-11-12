/**
 * Información legal, privacidad, exención de responsabilidad y licencias de terceros.
 *
 * Para añadir una marca o correo de contacto en el futuro, actualiza `brandName`
 * y `contactEmail` dentro de `APP_LEGAL_INFO`.
 */

export interface LegalOwnerInfo {
  appName: string;
  tagline: string;
  copyrightYear: number;
  ownerName: string;
  /** Nombre comercial futuro (dejar en null hasta definir la marca). */
  brandName: string | null;
  /** Correo de contacto futuro (dejar en null hasta disponer del correo oficial). */
  contactEmail: string | null;
  licenseName: string;
  repositoryUrl: string;
}

export interface ThirdPartyLicenseEntry {
  name: string;
  version: string;
  layer: "Frontend" | "Backend (Rust)" | "Tipografía";
  license: string;
  copyright: string;
  note?: string;
  url?: string;
}

export const APP_LEGAL_INFO: LegalOwnerInfo = {
  appName: "Power Diagram",
  tagline: "ERD Studio & SQL Architect",
  copyrightYear: 2026,
  ownerName: "José Arocha",
  brandName: null,
  contactEmail: null,
  licenseName: "MIT",
  repositoryUrl: "https://github.com/alepreddev/power-diagram",
};

export const MIT_LICENSE_TEXT = `MIT License

Copyright (c) ${APP_LEGAL_INFO.copyrightYear} ${APP_LEGAL_INFO.ownerName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const PRIVACY_POLICY_ITEMS = [
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
] as const;

export const DISCLAIMER_PARAGRAPHS = [
  "Este software se proporciona «tal cual» («AS IS»), sin garantías expresas ni implícitas de ningún tipo, conforme a la Licencia MIT.",
  "Los scripts DDL SQL y esquemas exportados deben ser revisados y validados por el usuario antes de ejecutarse en bases de datos de producción. El autor no asume responsabilidad por pérdida de datos o daños derivados del uso del software.",
  "Los nombres y logotipos de PostgreSQL, MySQL, SQLite y SQL Server se utilizan de forma exclusivamente nominativa para identificar dialectos compatibles. Power Diagram no está afiliado, patrocinado ni respaldado por PostgreSQL Global Development Group, Oracle Corporation, SQLite Consortium / Hwaci ni Microsoft Corporation.",
] as const;

export const THIRD_PARTY_LICENSES: readonly ThirdPartyLicenseEntry[] = [
  {
    name: "elkjs",
    version: "0.12.1",
    layer: "Frontend",
    license: "EPL-2.0",
    copyright: "Ulf Rüegg & Eclipse Layout Kernel contributors",
    note: "Licencia dual (EPL-2.0 OR GPL-3.0-or-later); distribuido sin modificar bajo Eclipse Public License 2.0.",
    url: "https://github.com/kieler/elkjs",
  },
  {
    name: "@fontsource-variable/geist",
    version: "5.3.0",
    layer: "Tipografía",
    license: "OFL-1.1",
    copyright: "Copyright 2024 The Geist Project Authors",
    note: "Distribuido bajo SIL Open Font License 1.1; la fuente no puede venderse por separado.",
    url: "https://github.com/vercel/geist-font",
  },
  {
    name: "@dbml/core & @dbml/parse",
    version: "11.0.0",
    layer: "Frontend",
    license: "Apache-2.0",
    copyright: "Holistics",
    url: "https://github.com/holistics/dbml",
  },
  {
    name: "Tauri Framework & Plugins",
    version: "2.x",
    layer: "Backend (Rust)",
    license: "MIT OR Apache-2.0",
    copyright: "Tauri Programme within The Commons Conservancy",
    note: "Incluye tauri, wry, plugin-sql, plugin-dialog y plugin-opener (tao bajo Apache-2.0).",
    url: "https://v2.tauri.app",
  },
  {
    name: "React & React DOM",
    version: "19.3.1",
    layer: "Frontend",
    license: "MIT",
    copyright: "Meta Platforms, Inc. and affiliates",
  },
  {
    name: "@xyflow/react",
    version: "12.12.0",
    layer: "Frontend",
    license: "MIT",
    copyright: "webkid GmbH / xyflow contributors",
  },
  {
    name: "@uiw/react-codemirror & @codemirror/lang-sql",
    version: "4.25.12 / 6.10.0",
    layer: "Frontend",
    license: "MIT",
    copyright: "uiwjs & Marijn Haverbeke / CodeMirror contributors",
  },
  {
    name: "lucide-react",
    version: "1.66.0",
    layer: "Frontend",
    license: "ISC",
    copyright: "Lucide Contributors",
  },
  {
    name: "Radix UI, Zustand, Tailwind CSS & html-to-image",
    version: "1.x - 5.x",
    layer: "Frontend",
    license: "MIT",
    copyright: "Sus respectivos autores y colaboradores",
  },
  {
    name: "class-variance-authority",
    version: "0.7.1",
    layer: "Frontend",
    license: "Apache-2.0",
    copyright: "Joe Bell",
  },
  {
    name: "Rust Crates (sqlx, serde, serde_json, cssparser, icu_*, zlib-rs)",
    version: "Cargo.lock",
    layer: "Backend (Rust)",
    license: "MIT / Apache-2.0 / MPL-2.0 / Unicode-3.0 / Zlib",
    copyright: "Autores del ecosistema Rust (ver THIRD_PARTY_LICENSES.txt)",
    note: "Sin dependencias GPL ni AGPL en Cargo.lock. Detalle completo incluido en THIRD_PARTY_LICENSES.txt.",
  },
];
