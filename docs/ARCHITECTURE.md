# JRXML Web Designer — Architecture

> A map of the code for developers and AI assistants: what the app does, where things live, and how data moves. Feature rules in detail (boxes, page border, data tables, styles, undo) are in `CLAUDE.md`.

## 1. Overview

A browser-based visual designer for JasperReports JRXML templates. Users build a report on a drag-and-drop canvas; the app keeps the canvas, a JSON model and the JRXML in step.

- **Stack**: Vue 3 (`<script setup>`) + TypeScript (strict) + Vite + Naive UI + vue-i18n (English, Malay), icons from `@lucide/vue`
- **Design goals**
  - **WYSIWYG**: the canvas matches what the report prints
  - **Round-trip integrity**: edit → export JRXML → re-import gives the same result
  - **JasperReports compliance**: generated JRXML is valid against the JasperReports XSD and compiles
  - **Client-side JRXML**: generating and parsing happen in the browser; servers are only used for the PDF preview and table data

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Vue Canvas  │  ⇄  │  Structured JSON │  ⇄  │  JRXML (XML) │
│  (UI layer)  │     │  (data model)    │     │  (file)      │
└──────────────┘     └──────────────────┘     └──────────────┘
 DesignerCanvas.vue    PDFDesigner.vue          jrxmlGenerator.ts
 element components    (reactive refs)          jrxml/parse.ts
```

### App shell

| Route | View | Notes |
|-------|------|-------|
| `/login` | `LoginView` | Enter and verify the tenant URL, then sign in (OAuth 2.0 + PKCE, `services/authService.ts`, `utils/pkce.ts`, `config/auth.config.ts`) |
| `/callback` | `CallbackView` | Exchanges the code for a token; stored in localStorage (`AUTH_TOKEN_KEY`) |
| `/desktop-login` | `DesktopLoginView` | Desktop (Tauri) sign-in: the browser hands the result back through a deep link (`App.vue`, `@tauri-apps/plugin-deep-link`) |
| `/` | `AppLayout` → `HomeView` | Home: recent templates (sample data for now), create a template |
| `/mytemplates`, `/activity`, `/myprofile` | placeholder views | Being built |
| `/designer` | `PDFDesigner` | The editor |

Every route except login, callback and desktop login needs a signed-in user (`router` guard, `utils/auth.ts`). `services/apiClient.ts` adds the token to requests and sends the user to login on a 401.

## 2. Directory Structure

```
jrxml_web_designer/
├── jasperreport6Fork/        # Official JasperReports source: reference only, never modify
├── docs/                     # ARCHITECTURE, JRXML_REFERENCE, VALIDATION, DEPLOYMENT
├── tools/  validator/  test-attribute-validation/  tests/   # JRXML validation tools (docs/VALIDATION.md)
├── src-tauri/                # Desktop app shell
└── src/
    ├── main.ts  App.vue  i18n.ts  router/  views/
    ├── locales/              # en.json, ms.json (kept in sync)
    ├── types/                # index.ts (design model), dataSource.ts (table data)
    ├── config/               # apiConfig.ts, fonts.config.ts
    ├── services/             # apiClient, auth, reportService (PDF), dataSourceService (table data), images
    ├── mocks/                # Dummy table data sources until the backend API exists
    ├── mcp/                  # AI assistant tool schemas
    ├── composables/          # useUndoRedo, useZoom, useTableRows, useDesignerFiles, useLivePreview, alignment/snap/drag…
    ├── components/
    │   ├── PDFDesigner.vue           # ★ Orchestrator: holds the whole model
    │   ├── ElementLibrary.vue        # Left panel: element tiles, Report Data, Styles
    │   ├── designer/                 # DesignerCanvas, ReportDataPanel, selection/alignment layers
    │   │   └── properties/           # ElementProperties (right panel), TableDataPanel, FrameProperties, PaginationProperties…
    │   ├── elements/                 # One component per element type + ElementRegistry.ts (library tiles, defaults)
    │   ├── modals/                   # BaseModal, PdfPreviewModal, TableConfigModal…
    │   ├── panels/                   # BottomPanel (Page Settings, JRXML Content), Left/Right panels
    │   ├── editor/                   # CodeMirror JRXML editor
    │   ├── common/                   # ColorSwatchPicker, DataGrid, LanguageSwitcher…
    │   └── ai/                       # AI assistant panel
    └── utils/
        ├── jrxmlGenerator.ts         # ★ JSON → JRXML
        ├── jrxmlHtmlRenderer.ts      # JRXML → HTML (canvas rendering helper)
        ├── framePresets.ts           # Boxes, templates, page border, rounded borders
        ├── paginationPresets.ts      # Page Number element
        ├── jrxml/
        │   ├── parse.ts              # ★ JRXML → JSON
        │   ├── xmlBuilder.ts         # <jasperReport> open tag
        │   ├── xmlEscape.ts          # xmlAttr / cdata: escaping for every written value
        │   ├── formatXml.ts          # Indents JRXML for the editor (whitespace only)
        │   ├── tableXml.ts           # Data tables ⇄ JRXML
        │   ├── xsdValidator.ts       # Validate XSD + Auto Fix
        │   └── validator.ts, types.ts, uuidGenerator.ts
        └── table/                    # Data table logic: binding, layout, themes, drag payloads
```

## 3. Data Model (`src/types/index.ts`)

| Type | Description |
|------|-------------|
| `ReportProperties` | Page size, margins, default font. `columnWidth = pageWidth − leftMargin − rightMargin` |
| `Band` | A layout section holding `elements`. Used: Background, Page Header, Column Header, Detail (one per designer page), Column Footer, Page Footer. There is no Title or Summary |
| `DesignElement` | `TextFieldElement \| ImageElement \| LineElement \| RectangleElement \| EllipseElement \| FrameElement \| TableElement \| ChartElement \| BarcodeElement` |
| `TableElement` | `{ type: "table", binding?, headerHeight?, rowHeight? }`. `binding` (`TableDataBinding`, `src/types/dataSource.ts`) is the whole table setup |
| `ReportStyle`, `ConditionalStyle` | Report styles, generated only for tables (`TableLook` → three styles) |
| `ReportField`, `ReportParameter`, `ReportVariable` | Data definitions |

Every element has `x`, `y` (points, from the top-left of its band or box), `width`, `height` and a `uuid` (required by the XSD, made with `crypto.randomUUID()`).

## 4. Core Data Flows

### 4.1 UI → JSON (binding)

`PDFDesigner.vue` holds the model in reactive refs (`reportProperties`, `bands`, `reportFields`, `reportStyles`…), with no state library. Canvas and property panels change the model directly (drag → `x`/`y`, property edit → element field, delete → splice). Every change takes an undo snapshot first (`useUndoRedo`, one snapshot per user action). A watcher regenerates the JRXML after each change.

### 4.2 JSON → JRXML (generation)

Entry: `generateJRXMLContent()` in `src/utils/jrxmlGenerator.ts`.

1. `<jasperReport>` open tag (`xmlBuilder.ts`)
2. Properties, report font, table styles (three per table look; saved table styles as the `com.cdp.tableStyles` property), parameters, sub-datasets (one per data table), fields, variables, groups
3. Bands in XSD order, `<background>` first. Designer pages become Detail bands separated by `<break type="Page">`
4. Each element: `<reportElement>` + type-specific content. Tables come from `tableXml.ts`; rounded boxes become marked rounded rectangles
5. Every value goes through `xmlAttr()` / `cdata()` so typed text can't break the XML

### 4.3 JRXML → JSON (parsing)

Entry: `parseJRXMLContent()` in `src/utils/jrxml/parse.ts`, using the browser `DOMParser`. Elements are found by tag name, then namespace-aware lookup, then `localName`, since tools write namespaces differently. It extracts properties, bands, fields, parameters, datasets, variables and styles. `<staticText>` becomes a Text element; `<title>`, `<summary>`, subreports, lists, crosstabs and other unsupported parts are dropped; tables are rebuilt from their `com.cdp.table.binding` property.

### 4.4 Round-trip risks

- Whitespace in text may be normalised by XML parsers
- Attribute order and namespace prefixes can differ from the original file
- UUIDs may be regenerated on import (JasperReports accepts this)
- Values equal to the default may be left out of the generated file

## 5. Components

### 5.1 Layout

- **Left**: `ElementLibrary.vue`, with element tiles (Basic, Composite, Element Presets), the Report Data list (projects, their details and tables) and Styles
- **Centre**: `DesignerCanvas.vue`, with page sheets, bands, element components, rulers and grid
- **Right**: `ElementProperties.vue`, with the selected element's properties (Basic / Style Settings / Table tabs), or report and band settings when nothing is selected
- **Bottom**: `BottomPanel.vue`, with Page Settings and JRXML Content (CodeMirror editor, Validate XSD, Auto Fix, Preview PDF, Download)

### 5.2 Designer features in code

| Feature | Where |
|---------|-------|
| Pages | One Detail band per page (`pageIndex` on elements); "Add page after" in the canvas; written as `<break type="Page">` |
| Boxes, presets, page border | `utils/framePresets.ts`, `elements/FrameElement.vue` |
| Page Number | `utils/paginationPresets.ts`, `properties/PaginationProperties.vue` |
| Text editing | `elements/TextFieldElement.vue`, `TextFormatToolbar.vue`, `utils/textFit.ts` |
| Images | `services/imageService.ts` (upload to `<VITE_OAUTH_BASE_URL>/rest/files`), crop and corner radius in `utils/elementUtils.ts` |
| Data tables | `utils/table/`, `jrxml/tableXml.ts`, `modals/TableConfigModal.vue`, `designer/ReportDataPanel.vue` |
| Project details on the page | `utils/projectFields.ts` (a dropped detail becomes plain text or a fixed image) |
| Band fitting | `utils/bandFit.ts`, `utils/pageFit.ts`, `properties/BandHeightControls.vue` |
| Undo / redo | `composables/useUndoRedo.ts` (whole-model snapshots) |
| Auto-save, files | `composables/useDesignerFiles.ts`, `utils/fileUtils.ts` (browser localStorage) |

### 5.3 AI Assistant

`components/ai/AIChatPanel.vue` (right panel tab) talks to an OpenAI-compatible API (`config/aiConfig.ts`, `composables/useAIChat.ts`). The model edits the design through tools defined in `mcp/schemas/toolSchemas.ts` and run by `mcp/handlers.ts`: reading the design, creating, moving, resizing, aligning, styling and deleting elements, band heights, report properties, fields and parameters, undo and redo. Destructive actions ask for confirmation (`mcp/confirmHandler.ts`).

### 5.4 Modals

All are built on `BaseModal.vue`: `TableConfigModal` (table setup), `PdfPreviewModal` (PDF preview, read-only table list), `FieldManagementModal`, `VariableManagementModal`, `PreviewServerSettingsModal`, `HelpModal`, and the generic `InputModal` and `ConfirmModal`.

### 5.5 Interaction

- Native HTML5 drag and drop from the library; snap to grid and to alignment guides
- Click selects; rubber-band selection (`SelectionBox.vue`) selects several, then `MultiSelectToolbar` aligns and distributes them
- Shortcuts: `Ctrl+Z` / `Ctrl+Y` undo/redo, `Delete`, arrow keys to nudge, `Ctrl+C` / `Ctrl+V`, `Ctrl+A`

## 6. Data Tables

Report data comes from the backend per project (dummy projects in `src/mocks/` until `VITE_DATA_SOURCE_API` is set). The user picks the report's projects in Report Data; each project offers its details (name, logo, introduction…; dragged onto the page, the value is copied into a normal Text or Image element) and its table sources. Tables show rows from a project's source: the user drags a source from Report Data onto a table and sets columns, filters, sort and totals in `TableConfigModal` (filters in `TableFilterPanel.vue`); the table's Basic Properties tab picks the style, its Style Settings tab customizes it (`TableDataPanel.vue`). The JRXML gets one sub-dataset per table, and the setup is saved as JSON in the `com.cdp.table.binding` property. Full rules: `CLAUDE.md`, "Data Tables".

## 7. External Services

### 7.1 PDF preview server

- `POST https://preview.report.projectnowcdp.com/api/pdf/generateForm` (configurable in Preview Server Settings)
- Sends the JRXML, parameters, one main data row, and each table's rows as `subDataSources[datasetName]`; returns the PDF
- Code: `services/reportService.ts`, `PdfPreviewModal.vue`. Server source: https://github.com/fengyunhe/jrxml_preview_server

### 7.2 CDP backend

`VITE_OAUTH_*` settings: sign-in, the current user, image uploads (`/rest/files`) and templates (`services/home/homeServices.ts`, `rest/reports/report`).

### 7.3 Table data API

`services/dataSourceService.ts`: `GET sources`, `GET sources/{id}/schema`, `POST sources/{id}/query` (filters, sort, limit). The full contract is in the file header.

## 8. Internationalization

vue-i18n with `en` (default) and `ms` in `src/locales/`. The EN / BM switcher is on the login page, the home header and the editor header; the choice is stored in localStorage (`appLocale`). All UI text goes through translation keys.

## 9. Validation

There are no unit tests in this repo. JRXML is checked with Validate XSD and Preview PDF in the app, with throwaway scripts, and with the tools in `docs/VALIDATION.md`.

## 10. Commands

```bash
npm run dev           # Vite dev server
npm run build         # vue-tsc + vite build
npm run preview       # Preview the production build
npm run tauri:dev     # Desktop app, development
npm run tauri:build   # Desktop app, build
npm run release       # Version bump, build, commit (scripts/release.js)
```

## 11. Common Tasks

### Adding a new element type

1. Add the interface to `src/types/index.ts` and the `DesignElement` union
2. Register it in `components/elements/ElementRegistry.ts` (tile, icon, defaults) and add its component
3. Parse it in `jrxml/parse.ts` and generate it in `jrxmlGenerator.ts` (escape every value)
4. Add its properties to `ElementProperties.vue`
5. Check undo/redo, the round trip, and Validate XSD + Preview PDF in the app

### Debugging a JRXML problem

1. Download the JRXML from the JRXML Content panel
2. Run Validate XSD; for compile errors use Preview PDF or the compiler in `tools/`
3. Compare with `docs/JRXML_REFERENCE.md` (element order, attributes)
