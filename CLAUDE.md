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
- `<staticText>` is read as a Text element (`textField` with a quoted literal expression); `<break>` only splits detail pages and is never kept; an `<image>` carrying `com.cdp.chart.binding` is read as a Chart; subreport, list, crosstab, map, icon label, sort and generic elements and native JasperReports charts (`<pieChart>`…) are not supported and are dropped on import, as are the `<title>` and `<summary>` sections (the designer has no Title or Summary; content goes in Detail)
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
- `Band` — layout region (detail, pageHeader, columnHeader, background…) containing elements; no title or summary
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
- **Image shapes** (Basic tab → Shape: Square, Rounded, Soft, Circle, Pill, Leaf, Top round, Drop; `IMAGE_SHAPES` in `utils/elementUtils.ts`): stored as `com.cdp.image.shape`, each corner a share of the image's short side, so the shape follows resizing (Circle also makes the image square). The generator always writes the pixel radii for the current size into `com.cdp.image.cornerRadius` (`reportElementProperties`). Typing a corner in Style Settings drops the shape (Custom).

## Report Data (projects)

All report data comes from **projects** in the backend. The left "Report Data" list (`designer/ReportDataPanel.vue`) first asks which projects the report uses (one multi-select field, several allowed); the chosen projects then appear as **tabs** (logo and short code, full name in the tooltip; they wrap onto more rows; arrow keys move between them; a newly added project opens its tab), and the open tab shows that project's **details** (name, code, logo, description, introduction, client…; `ProjectDetails` in `src/types/dataSource.ts`) and its **tables** (sources). Table rows are never stored in the design (fetched each time); detail values are copied into the design when dropped (below).

- **Chosen projects** live in `ReportProperties.projects` (so undo and saving cover them), written as the report property `com.cdp.projects`. A project still used by a table can't be removed from the list (`countProjectUsage`).
- **Details are copied, never linked**: dragging a detail onto the page puts its current value into an ordinary **Text** element (the logo into an **Image** element, as a fixed picture) and nothing stays connected to the project: no parameters, no marker property, no unlink. The user edits it like any text (double-click) and drags the detail again for a newer value. The drag carries the value (`DataSourceDragPayload` `projectField`), and `applyProjectValue` (`utils/projectFields.ts`) writes it the way typed text is stored. A detail with no value is refused with a message.
- Dropped **onto an existing** Text element (a logo onto an Image element), it replaces that element's content and keeps its place, size and look (`fillDroppedProjectValue`, `canTakeProjectField`; the wrong kind or a page number is refused with a message; the element frame turns blue / red while dragging). Dropped on empty space, a new element is made. One undo step either way.

## Data Tables

A table shows rows of a project's backend **source** (Procurement, Materials…). Users drag a source (or one column) from the left "Report Data" list onto a table; there are no expressions or queries in the UI. Rows are never stored in the design: they are fetched each time, for the canvas, the preview and the real report.

- **The setup is the single source of truth**: `TableElement.binding` (`TableDataBinding` in `src/types/dataSource.ts`): project (`projectId`, `projectName`; each table can use a different project), source, columns (key, header text, type, width, total), filters, one sort, row limit, totals, style (`theme` + `look` + `customized`), table name and a unique `datasetName`. A table without a binding is an empty placeholder (header + one row, 3 columns, "Drag table data here").
- **Several tables per report**, each independent: its own `datasetName` (`table_xxxxxx`) and name ("Table N"). Copies get new ones (`ensureUniqueTableDatasets` in `utils/table/tableDocument.ts`, called on paste and load).
- **JRXML** (`utils/jrxml/tableXml.ts`), all derived from the binding when the report is written: one `<subDataset>` per table (fields typed loosely, `java.lang.Number` / `java.lang.Object`, because JSON numbers may arrive as Integer and dates as ISO text; cells format them), total variables, `<jr:table>` with header / totals / detail cells styled by the table's look, a no-data cell, and the binding as JSON in the `com.cdp.table.binding` property. The parser rebuilds the table from that property only and drops the table's own `<subDataset>`. An empty table is written as an empty frame carrying the property. Items below a table get `positionType="Float"` so they move down when it grows.
- **Rows reach the report by dataset name**: the preview sends `subDataSources[datasetName]`; the backend running real reports reads each table's `com.cdp.table.binding` and fetches the same rows.
- **Only in the Detail section** (it grows onto new pages; Title and Summary are not supported); never inside a box. Width: at least `MIN_TABLE_COLUMN_WIDTH` (60) per column, so the column limit follows the table width. Height on the canvas: header + up to 5 sample rows (last one "+N more rows") + totals; the PDF prints every row.
- **Data access** goes only through `services/dataSourceService.ts` (`listProjects`, `getProject`, `listSources`, `getSchema`, `getFacets`, `queryRows`; all under `projects/{id}`, contract in the file header). Until `VITE_DATA_SOURCE_API` is set it uses `src/mocks/` (dummy projects with logos, their sources, and the filter/sort logic the backend will take over); never add filtering elsewhere.
- **Editing** happens only in the Configure popup (`modals/TableConfigModal.vue`; double-click a table, "Edit data", or drop a source; it picks the project, then the source); Apply is one undo step Dropping a different source on a filled table replaces its data (like replacing an image): the popup opens with the new source and says so; the table keeps its name and style. The popup has no style picker (styles live in Table Properties). The popup copies the setup with JSON, not `structuredClone` (it can't copy Vue's reactive objects). The preview window is read-only and links back with "Edit in designer".
- **Filter & sort** (`designer/TableFilterPanel.vue` in the Configure popup) works like a shop's filter panel, no technical words: a category list (Sort, then each column) and its choices. Text columns: tick values, with counts, plus search (`operator: "in"`, `values`). Numbers, amounts and dates: a range with quick picks (round buckets, or one per month) plus Min/Max or From/To (`operator: "between"`, either end optional). Dates also offer moving ranges (This month, Last month, This quarter, This year, Last 30 days: `period` on the filter), so a report reused next month shows next month's data; `resolveFilterDates` turns them into dates inside `dataSourceService` before every request (a backend running a saved report must do the same). Filters on different columns all apply; ticked values of one column match any. Only one sort at a time, named for the column type ("Low to high", "A to Z", "Newest first"). Choices come from `getFacets(sourceId)` (backend `GET sources/{id}/facets`; mock `columnFacets`). Filters and sorts carry `label`/`type` for summaries (`utils/table/summary.ts`).
- **Table styles** (`utils/table/tableThemes.ts`) are the only styles in the designer. There are no general report styles, Style Management, Style Reference or Parent Style; imported `<style>`s and elements' `style` attributes are dropped.
  - Built-in styles Corporate Blue, Minimal, Emerald (`BUILTIN_LOOKS`) are fixed.
  - A look is a `TableLook` (header/rows/totals colours and bold, stripes, lines grid/rows/none, line and header-line colours, text size). Each table carries its own: `binding.theme` = the style it started from (built-in id or saved id), `binding.look` = its actual look (empty for an unchanged built-in), `binding.customized` = changed for this table only. Canvas, popup, preview and JRXML all read `resolveLook(binding)`, so they need nothing else.
  - Table properties follow the Box pattern (`TableDataPanel.vue`, `part` prop): **Basic Properties** = position & size, Data (name, source, filters, Edit data), Look (style tiles, saved-style rename/delete, "changed" note with Reset, Customize button that opens Style Settings), row sizes; **Style Settings** = the Customize editor and Save / Update as table style. Customize changes only that table. "Save as table style" turns its look into a `SavedTableStyle` in the report (`tableStyles` in `PDFDesigner.vue`, written as the report property `com.cdp.tableStyles`); "Update (style name)" overwrites the saved style and every table using it unchanged. Deleting a saved style keeps its tables' look as their own changes. Styles are managed only in the table's properties (no list in the left panel): the style tiles (built-ins locked), and for a table on a saved style a bar to rename or delete that style.
  - JRXML: three report styles per look (`buildLookStyles`; header, row with stripes as a conditional style, totals): `Table_CorporateBlue_*` etc. for built-ins, `TableStyle_<id>_*` for saved styles, `Table_<datasetName>_*` for customised tables (`tableStylePrefix`, `tableReportStyles`).

## Charts

One **Chart** element with nine types (KPI Stat, Gauge, Line, Area, Bar, Horizontal Bar, Pie, Donut, Tree Map; `utils/chart/chartTypes.ts`), the same set as the CDP app's dashboards. It works like Page Number: clicking the library tile asks for the type (grouped: Track one number, Show a trend, Compare categories, Part of a whole), dragging it drops a bar chart, and Basic Properties changes the type.

- **The setup is the chart**: `ChartElement.binding` (`ChartBinding` in `src/types/dataSource.ts`): type, title, legend, colour set, and its data: project and source, the number shown (`measure`: count, or total / average / lowest / highest of a number column), categories (`dimension`; dates grouped by day…year), the tree map's `level2`, the lines or bars (`series`, each optionally one per value of a text column), `stacked`, `limit` (largest N text categories, the rest added up as "Other" for counts and totals), `gaugeMax`, `filters` (the table filters). `normalizeChartBinding` reads any stored value safely; `isChartComplete` says whether the type has everything it needs; `changeChartType` keeps the data when the type changes.
- **Numbers are never stored**: charts use the CDP backend's analytics endpoint, exactly as the CDP app's dashboards do (cdp-fe-app `aggregate.api.ts`): `POST {VITE_OAUTH_BASE_URL}/v2/analytics/aggregate` with the user's login, body `AggregateRequest` (`entityName` from the source's schema, `measure` `{ aggregation: "SUM", property }`, `dimension` `{ property, granularity: "MONTH" }`, `splitBy` `{ property }`, the chart's filters as a Jmix `filter`, and `globalFilter` `project.id = projectId`), answer `AggregateResult` (rows / series with `key`, `label`, `value`, `count`; `totalValue`, `totalCount`, `truncated`; an `{ data, message, status }` wrapper is unwrapped). `chartRequests()` (`chartQuery.ts`) builds one request per series (the binding keeps lowercase names; only the request uses the CDP ones); `aggregate()` in `dataSourceService.ts` sends it, or answers it from the dummy rows (`aggregateRows`) while Report Data is dummy data; `mergeChartData()` puts the answers in order (dates by time with empty buckets filled, text by size), labels them and adds "Other". Answers are cached for the session by request (`chartDataStore.ts`, cleared by the Report Data refresh button); the canvas asks for them, and Preview PDF / Download wait for every chart first (`ensureChartData`). When numbers arrive, `chartDataVersion` makes the designer rewrite the JRXML.
- **States** (`chartView`, `chartImage.ts`): not linked → sample numbers, faded, "Sample data" badge; linked but unfinished, loading, or failed → the same with a badge saying so; ready → real numbers. Only ready charts print; the others are written with an empty image and print nothing.
- **Data setup** happens in the Configure popup (`modals/ChartConfigModal.vue`; double-click the chart, "Set up data" / "Edit data" in Basic Properties, or drop a source or column from Report Data onto it, which opens the popup with that source). It picks the type, project, source, what to show and the filters (`TableFilterPanel` without Sort), with a live preview at the chart's size; Apply is one undo step. A new source gets sensible defaults (a date column for charts over time, otherwise the text column with the fewest different values). Series measuring different things (a count next to amounts) get a second scale.
- **One look for canvas and PDF**: `buildChartOption()` (`chartOption.ts`) turns setup + numbers into ECharts settings laid out for print (no animation or tooltips). The canvas draws them live; `chartImageDataUri()` (`chartImage.ts`) renders the same settings to SVG. ECharts is imported from `echarts/core` with the SVG renderer only (`echartsSetup.ts`).
- **JRXML**: a chart is an `<image>` whose expression is an SVG data URI and whose `com.cdp.chart.binding` property holds the setup. The parser rebuilds the chart from the property and ignores the picture. The report server already prints data-URI images (`processImageElement`), SVG as vector graphics through Batik. ECharts' `<style>` block (hover rules only) is removed from the SVG because Batik fails on it.
- **Colours never repeat**: `chartColors(palette, count)` (`chartTypes.ts`) gives the colour set's own colours, then generates new distinct ones in the same style (shades of grey for the grey set), as many as the chart needs: one per slice, tree map group, series, or, for bar charts with one series, one per bar (their legend is hidden; the axis names the bars).
- Charts go in any band and inside boxes (a fixed-size image never grows). Charts are never uploaded to S3: the picture is redrawn from the setup every time. A project used by a chart can't be removed from the report (`countProjectUsage`), and the Report Data list names the charts using each source.

## Project Structure

Full map: `docs/ARCHITECTURE.md`.

```
jasperreport6Fork/           # OFFICIAL JasperReports Library source — REFERENCE ONLY, DO NOT MODIFY
├── ...                      # (JasperStudio Library fork, not part of this project)

src/
├── components/
│   ├── PDFDesigner.vue          # Main orchestrator component
│   ├── designer/                 # Canvas sub-components (elements, bands)
│   ├── modals/                   # PdfPreviewModal, PreviewServerSettingsModal, etc.
│   ├── panels/BottomPanel.vue    # Page Settings + JRXML Content (validate, preview, download)
│   ├── ai/                       # AI Assistant chat panel
│   └── elements/                 # Element components + ElementRegistry.ts
├── composables/                  # Vue composables (useLivePreview, etc.)
├── config/
│   └── apiConfig.ts             # API endpoint configuration
├── types/
│   ├── index.ts                 # All TypeScript interfaces
│   └── dataSource.ts            # Table data types
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

**Keep the JRXML validation tools**: Validate XSD / Auto Fix / Preview PDF in the app, `tools/`, `validator/`, `test-attribute-validation/`, and the scripts and sample reports in `tests/` (`jrxml-compatibility-test.ts`, `test_autofix.spec.ts` + its `.jrxml` files, `preview-server-test.html`). They are standalone checkers, not a test framework. Never delete them as "test files". How to run them: `docs/VALIDATION.md`. JRXML element order and attributes: `docs/JRXML_REFERENCE.md`.

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
- Multi-select fields (e.g. the Report Data projects) use `@vueform/multiselect` (`mode="tags"`, its `themes/default.css` restyled with `--ms-*` variables); its built-in icons are replaced through the `tag`, `option`, `caret` and `spinner` slots with Lucide icons
- **Icons come from `@lucide/vue` only** (`import { Trash2 } from "@lucide/vue"`, sized with `:size` / `:stroke-width`). Never add hand-written inline `<svg>` icons, `h("svg")` render functions, SVG strings with `v-html`, SVG `data:` URIs in CSS, icon image files, or emoji / Unicode glyphs used as icons (✕ ▶ ⚠ 🤖 …). Element library icons are Lucide components in `ElementRegistry.ts` (`iconComponent`); plain-DOM code mounts them with Vue `render(h(Icon), el)` (see `utils/notification.ts`). Native `<option>` text can't hold icons, so leave options as plain text. If no Lucide icon fits, suggest the closest Lucide candidates to the user and let them choose instead of drawing one. Decorative shapes are plain CSS. Inline `<svg>` is only for drawing report content: lines (`LineElement.vue`, `jrxmlHtmlRenderer.ts`) and the canvas grid
- Default report font: Noto Sans SC (`DEFAULT_REPORT_FONT` in `src/config/fonts.config.ts`), the only font the report server has. Font pickers offer only `SUPPORTED_FONTS` (read-only with an info note while there is one); `resolveReportFont()` maps any other stored font to the default on the canvas and in the JRXML. `SYSTEM_FONTS` is kept for when more fonts are supported
- JRXML namespace: `http://jasperreports.sourceforge.net/jasperreports`
- Element UUIDs required by JasperReports XSD
- **Styles** (`<style>`) are written only for tables and follow the JasperReports schema: font and alignment are attributes (`fontName`, `fontSize`, `isBold`, `hTextAlign`, `vTextAlign`), and conditions only appear inside `<conditionalStyle>` (with a nested `<style>`). No parent styles, no `style` attribute on other elements.
- **Undo/redo** (`src/composables/useUndoRedo.ts`) snapshots the whole model (bands, fields, parameters, sub-datasets, saved table styles). Every editor change must take a snapshot **before** mutating: `saveStateToHistory()` in `PDFDesigner.vue`, `emit("save-state")` from property panels. One user action = one undo step: record once per action (not once per side or per keystroke; see `recordBorderEdit` in `ElementProperties.vue`), and for drags/resizes record at the start, not on mouse-up. New features must be checked with Ctrl+Z / Ctrl+Y.
