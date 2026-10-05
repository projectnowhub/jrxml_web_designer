# JRXML Web Designer

A browser-based visual designer for JasperReports JRXML templates, built with Vue 3 + TypeScript + Vite.

## Core Architecture

This is a **bidirectional JRXML designer**. The entire application revolves around three critical data transformations:

```
UI (Vue Canvas) ⇄ Structured JSON ⇄ JRXML (XML)
```

### Critical Path 1: JSON → JRXML (Generation)

- **Entry**: `src/utils/jrxmlGenerator.ts` → `generateJRXMLContent()`
- **XML header**: `src/utils/jrxml/xmlBuilder.ts` → `buildJasperReportOpenTag()`
- **Types**: `src/utils/jrxml/types.ts` (`ReportProperties`, `Field`, `Parameter`)
- Flattens the visual JSON model into JasperReports-compatible XML
- Handles all element types: textField, image, line, rectangle, ellipse, frame, table, chart, barcode. Designer pages are written as detail bands separated by `<break type="Page">`

### Critical Path 2: JRXML → JSON (Parsing)

- **Entry**: `src/utils/jrxml/parse.ts` → `parseJRXMLContent()`
- Uses browser `DOMParser` to parse XML
- Extracts: `properties`, `bands`, `fields`, `parameters`, `datasets`, `variables`, `styles`
- `<staticText>` is read as a Text element (`textField` with a quoted literal expression); `<break>` only splits detail pages and is never kept; subreport, list, crosstab, map, icon label, sort and generic elements are not supported and are dropped on import, as are the `<title>` and `<summary>` sections (the designer has no Title or Summary; content goes in Detail)
- Handles multiple namespace resolution strategies (direct children, namespace-aware, localName)

### Critical Path 3: JSON → UI Binding (Designer Canvas)

- **Main component**: `src/components/PDFDesigner.vue` — the core orchestrator
- Vue 3 reactive refs hold the JSON model (`reportProperties`, `bands`, `fields`, etc.)
- Elements rendered in `src/components/designer/` sub-components
- Drag/drop, resize, selection all operate on the JSON model directly
- Changes to JSON immediately reflect in the visual canvas

### Round-Trip Integrity

The most important invariant: **edit in designer → export JRXML → re-import → should produce identical visual result**. Any bug in parse/generate/bind breaks this.

## JSON Data Model

The central data structures live in `src/types/index.ts`:

- `ReportProperties` — page size, margins, default font
- `Band` — layout region (title, detail, pageHeader, etc.) containing elements
- `DesignElement` — union of `TextFieldElement | ImageElement | LineElement | RectangleElement | EllipseElement | FrameElement | TableElement | ChartElement | BarcodeElement` (the element library offers exactly these, plus the frame templates, Page Border and Page Number)
- `Field`, `ReportParameter`, `ReportVariable` — data model definitions
- `ReportStyle`, `ConditionalStyle` — style system

## Frames, Cards and Page Border

Logic lives in `src/utils/framePresets.ts`: border presets, per-side pen helpers, the library templates ("Element Presets": Number Box, Alert Box, Section Box, Photo Box; Page Border is under "Composite Elements"), and fitting a box's children when it is resized. The plain Box tile (Basic Elements, a `frame`) lets users build their own boxes; parts work the same in it.

- **Box parts**: the items a template builds (label, number, photo…) carry the `com.cdp.box.part` JRXML property (`isBoxPart`). Only these are kept inside their box when dragged, resized, nudged or typed; items the user drops into a box move freely. Parts act as a group, like PowerPoint (`FrameElement.vue`): dragging a part moves the whole box unless that part is already selected; a click on a part selects the box first, a second click the part; a right-click on a part opens the box's menu unless that part is already selected. Right-click on an item inside a box shows exactly one of "Add to box" (dropped-in item → part, `markBoxPart`) or "Move out of box" (part → ordinary item in the band, `releaseBoxPart`).

- **Page border** = a frame in the Background band, sized to the printable area. Only one is allowed (`findPageBorder`): the library tile is disabled once it exists, and add/paste show a warning and select the existing one. On the canvas the Background band is drawn over the bands (`mix-blend-mode: multiply`) and ignores the mouse, except a thin strip along the border line so it can be clicked. The Background band is never counted in band-height totals, and `<background>` is always written first.
- **Borders are pens only** (`box.pen` / `topPen`…); fills are a separate feature. The Basic tab shows presets only; per-side editing is the Style Settings side-border controls.
- **Rounded frames**: JasperReports can't round a frame border, so the generator writes marked rounded rectangles as the frame's first children, and the parser turns them back into the frame (`ROUNDED_BORDER_PROPERTY` marker, exact pens in `ROUNDED_BORDER_PENS_PROPERTY`):
  - `radius` + the same line on all sides → one rounded rectangle carrying the pen and fill
  - `radius` + a partial border (accents) → two stacked filled rounded rectangles (border colour behind, inside colour in front, inset by each side's width); solid, one colour, inside filled
  Canvas and generator share the same helpers (`getLayeredBorder`) so they always match. No SVG or images.
- **Corner radius per corner** (boxes, images and text, Style Settings: "All corners" + one field per corner): stored in CSS order ("12 0 6 0"), one value when all match. Boxes: all equal → `radius` (rounded rectangle above, rounded in the PDF); different → `cornerRadii`, written as the `com.cdp.box.cornerRadius` frame property. Images: always the `com.cdp.image.cornerRadius` property; text fields (page numbers included): always `com.cdp.text.cornerRadius`. JasperReports has one radius per rectangle and none on images or text fields, so the canvas draws these and the report server is expected to read the properties.

## Data Tables

A table shows rows of a backend **source** (Procurement, Products…). Users drag a source (or one column) from the left "Table Data" list onto a table; there are no expressions or queries in the UI. Rows are never stored in the design: they are fetched each time, for the canvas, the preview and the real report.

- **The setup is the single source of truth**: `TableElement.binding` (`TableDataBinding` in `src/types/dataSource.ts`): source, columns (key, header text, type, width, total), filters (all/any), sort, row limit, totals, theme, table name and a unique `datasetName`. A table without a binding is an empty placeholder (header + one row, 3 columns, "Drag table data here").
- **Several tables per report**, each independent: its own `datasetName` (`table_xxxxxx`) and name ("Table N"). Copies get new ones (`ensureUniqueTableDatasets` in `utils/table/tableDocument.ts`, called on paste and load).
- **JRXML** (`utils/jrxml/tableXml.ts`), all derived from the binding when the report is written: one `<subDataset>` per table (fields typed loosely, `java.lang.Number` / `java.lang.Object`, because JSON numbers may arrive as Integer and dates as ISO text; cells format them), total variables, `<jr:table>` with header / totals / detail cells styled by the theme, a no-data cell, and the binding as JSON in the `com.cdp.table.binding` property. The parser rebuilds the table from that property only and drops the table's own `<subDataset>`. An empty table is written as an empty frame carrying the property. Items below a table get `positionType="Float"` so they move down when it grows.
- **Rows reach the report by dataset name**: the preview sends `subDataSources[datasetName]`; the backend running real reports reads each table's `com.cdp.table.binding` and fetches the same rows.
- **Only in the Detail section** (it grows onto new pages; Title and Summary are not supported); never inside a box. Width: at least `MIN_TABLE_COLUMN_WIDTH` (60) per column, so the column limit follows the table width. Height on the canvas: header + up to 5 sample rows (last one "+N more rows") + totals; the PDF prints every row.
- **Data access** goes only through `services/dataSourceService.ts` (`listSources`, `getSchema`, `queryRows`). Until `VITE_DATA_SOURCE_API` is set it uses `src/mocks/` (dummy sources and the filter/sort logic the backend will take over); never add filtering elsewhere.
- **Editing** happens only in the Configure popup (`modals/TableConfigModal.vue`; double-click a table, "Edit data", or drop a source); Apply is one undo step Dropping a different source on a filled table replaces its data (like replacing an image): the popup opens with the new source and says so; the table keeps its name and theme. The popup copies the setup with JSON, not `structuredClone` (it can't copy Vue's reactive objects). The preview window is read-only and links back with "Edit in designer".
- **Themes** (`utils/table/tableThemes.ts`): Corporate Blue, Minimal, Emerald, each a set of named report styles (`Table_<Theme>_Header/_Row/_Totals`, striped rows by a conditional style) always written for the themes in use. Style Management holds only the styles of themes a table uses (`syncThemeStyles`, a watcher in `PDFDesigner.vue`): they join on first use and leave when no table uses the theme, unless the user edited them. The old JasperStudio table styles (`Table`, `Table_TH`, `Table_CH`, `Table_TD`) are dropped on load. Canvas, popup and preview draw cells from the same styles (`tableCellCss`).

## Project Structure

```
jasperreport6Fork/           # OFFICIAL JasperReports Library source — REFERENCE ONLY, DO NOT MODIFY
├── ...                      # (JasperStudio Library fork, not part of this project)

src/
├── components/
│   ├── PDFDesigner.vue          # Main orchestrator component
│   ├── designer/                 # Canvas sub-components (elements, bands)
│   ├── modals/                   # PdfPreviewModal, PreviewServerSettingsModal, etc.
│   └── BottomPanel.vue           # Bottom toolbar with preview button
├── composables/                  # Vue composables (useLivePreview, etc.)
├── config/
│   └── apiConfig.ts             # API endpoint configuration
├── types/
│   └── index.ts                 # All TypeScript interfaces
├── utils/
│   ├── jrxml/
│   │   ├── parse.ts             # JRXML → JSON parser
│   │   ├── types.ts             # Parse/generate type definitions
│   │   ├── xmlBuilder.ts        # XML tag builder helpers
│   │   ├── xmlEscape.ts         # xmlAttr / cdata: escaping for every written value
│   │   ├── formatXml.ts         # Indents JRXML for the editor (whitespace only)
│   │   ├── validator.ts         # JRXML validation rules
│   │   └── officialCompiler.ts  # (if exists) Reference compiler
│   ├── framePresets.ts          # Frame border presets, card templates, rounded-border encoding
│   └── jrxmlGenerator.ts        # JSON → JRXML generator
```

## Development Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build (vue-tsc + vite)
```

## No tests in this repo

The repo has no test framework and no test files, on purpose. **Never add test files, test folders, test config or test packages** (Vitest, Jest, jsdom, @vue/test-utils…).

**Keep the JRXML validation tools**: Validate XSD / Auto Fix / Preview PDF in the app, `tools/`, `validator/`, `test-attribute-validation/`, and the scripts and sample reports in `tests/` (`jrxml-compatibility-test.ts`, `test_autofix.spec.ts` + its `.jrxml` files, `preview-server-test.html`). They are standalone checkers, not a test framework. Never delete them as "test files".

To check a change, verify it with a throwaway script in the session scratchpad (outside the repo) and delete it once done. Run it with plain Node/`tsx`, or for the JasperReports engine check use the compile-and-fill harness with the jars in `~/.m2`. If a quick check really must sit inside `src/` (for the `@/` imports), delete it in the same session and make sure `git status` shows nothing left behind. Then confirm in the app itself.

### JRXML must stay valid: check it after every change

Any change to the generator, the parser, an element, a template, a style or a table must be checked for broken JRXML before it is called done. One stray `<`, `&`, quote or `]]>` and the report server rejects the whole report (`SAXParseException … The content of elements must consist of well-formed character data or markup`), so the preview and the real report both fail.

1. Every value the generator writes goes through `xmlAttr()` (attribute values) or `cdata()` (expressions) from `src/utils/jrxml/xmlEscape.ts`. Never write `="${value}"` or `<![CDATA[${value}]]>` directly.
2. With a throwaway script (see above), build a report that uses what you changed, with awkward text (`<`, `&`, quotes, `]]>`) in every place a user can type. Check it with a strict XML parser as generated, after a save and reload (`parseJRXMLContent` → `generateJRXMLContent`) and after `formatXml()`. Then delete the script.
3. In the app: JRXML Content → **Validate XSD**, then **Preview PDF**. Both must succeed.

The JRXML panel shows, validates, previews and saves the *formatted* text, so formatting must never change the report: use `formatXml()` (`src/utils/jrxml/formatXml.ts`, whitespace between tags only). Never use an HTML beautifier (`html_beautify` rewrote `<![CDATA[` into `< ![CDATA[` and `$V{` into `$V {`, which broke every report).

## Key Conventions

- TypeScript strict mode
- Vue 3 `<script setup>` composition API
- No external state management library — reactive refs in components
- i18n via vue-i18n: English (`en`, default) and Malay (`ms`); all text outside `src/locales/ms.json` is English; locale files in `src/locales/`, choice stored in localStorage (`appLocale`)
- User-visible text always goes through a translation key; never hard-code UI text
- Locale files stay in sync: whenever a key is added, changed, renamed or deleted in `src/locales/en.json`, make the same change in every other locale file (currently `ms.json`) in the same edit, with a real translation, not English copied over
- Colour inputs use `src/components/common/ColorSwatchPicker.vue` (Naive UI picker whose popover stays inside the window), not `<input type="color">`, whose native popup can open off-screen. Exception: the inline text toolbar (`TextFormatToolbar.vue`) keeps native inputs, because focus moving into a page popover would drop the text selection being formatted.
- **Icons come from `@lucide/vue` only** (`import { Trash2 } from "@lucide/vue"`, sized with `:size` / `:stroke-width`). Never add hand-written inline `<svg>` icons, `h("svg")` render functions, SVG strings with `v-html`, SVG `data:` URIs in CSS, icon image files, or emoji / Unicode glyphs used as icons (✕ ▶ ⚠ 🤖 …). Element library icons are Lucide components in `ElementRegistry.ts` (`iconComponent`); plain-DOM code mounts them with Vue `render(h(Icon), el)` (see `utils/notification.ts`). Native `<option>` text can't hold icons, so leave options as plain text. If no Lucide icon fits, suggest the closest Lucide candidates to the user and let them choose instead of drawing one. Decorative shapes are plain CSS. Inline `<svg>` is only for drawing report content: lines (`LineElement.vue`, `jrxmlHtmlRenderer.ts`) and the canvas grid
- Default report font: DejaVu Sans (`DEFAULT_REPORT_FONT` in `src/config/fonts.config.ts`), bundled in `public/fonts/dejavu/` and shipped with JasperReports
- JRXML namespace: `http://jasperreports.sourceforge.net/jasperreports`
- Element UUIDs required by JasperReports XSD
- **Styles** (`<style>`) follow the JasperReports schema: font and alignment are attributes (`fontName`, `fontSize`, `isBold`, `hTextAlign`, `vTextAlign`), the parent style is the `style` attribute, and conditions only appear inside `<conditionalStyle>` (with a nested `<style>`). The parser also reads the older `<textElement>` form.
- **Undo/redo** (`src/composables/useUndoRedo.ts`) snapshots the whole model (bands, fields, parameters, sub-datasets, report styles). Every editor change must take a snapshot **before** mutating: `saveStateToHistory()` in `PDFDesigner.vue`, `emit("save-state")` from property panels. One user action = one undo step: record once per action (not once per side or per keystroke; see `recordBorderEdit` in `ElementProperties.vue`), and for drags/resizes record at the start, not on mouse-up. New features must be checked with Ctrl+Z / Ctrl+Y.
