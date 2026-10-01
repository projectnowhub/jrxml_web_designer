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
- Handles all element types: staticText, textField, image, line, rectangle, ellipse, frame, table

### Critical Path 2: JRXML → JSON (Parsing)

- **Entry**: `src/utils/jrxml/parse.ts` → `parseJRXMLContent()`
- Uses browser `DOMParser` to parse XML
- Extracts: `properties`, `bands`, `fields`, `parameters`, `datasets`, `variables`, `styles`
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
- `DesignElement` — union of `StaticTextElement | TextFieldElement | ImageElement | LineElement | RectangleElement | EllipseElement | BreakElement | FrameElement | TableElement`
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
- **Corner radius per corner** (boxes, images and page numbers, Style Settings: "All corners" + one field per corner): stored in CSS order ("12 0 6 0"), one value when all match. Boxes: all equal → `radius` (rounded rectangle above, rounded in the PDF); different → `cornerRadii`, written as the `com.cdp.box.cornerRadius` frame property. Images: always the `com.cdp.image.cornerRadius` property; page numbers: always `com.cdp.text.cornerRadius`. JasperReports has one radius per rectangle and none on images or text fields, so the canvas draws these and the report server is expected to read the properties.

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
│   │   ├── validator.ts         # JRXML validation rules
│   │   └── officialCompiler.ts  # (if exists) Reference compiler
│   ├── framePresets.ts          # Frame border presets, card templates, rounded-border encoding
│   └── jrxmlGenerator.ts        # JSON → JRXML generator
├── test/
│   └── setup.ts                 # Vitest global mocks
└── tests/
    ├── *.jrxml                   # Fixture JRXML files for testing
    ├── unit/                     # Unit tests
    └── jrxml-pdf-preview.integration.test.ts  # Server integration tests
```

## Development Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build (vue-tsc + vite)
npm run test         # Run tests once (vitest)
npm run test:watch   # Watch mode
```

## Testing

- **Framework**: Vitest + jsdom + @vue/test-utils
- **Test files**: Co-located `*.test.ts` or under `tests/`
- **Fixtures**: `tests/*.jrxml` and `tests/build_by_*/`
- **Run specific**: `npx vitest run tests/path/to/file.test.ts`

## Key Conventions

- TypeScript strict mode
- Vue 3 `<script setup>` composition API
- No external state management library — reactive refs in components
- i18n via vue-i18n: English (`en`, default) and Malay (`ms`); all text outside `src/locales/ms.json` is English; locale files in `src/locales/`, choice stored in localStorage (`appLocale`)
- User-visible text always goes through a translation key; never hard-code UI text
- Locale files stay in sync: whenever a key is added, changed, renamed or deleted in `src/locales/en.json`, make the same change in every other locale file (currently `ms.json`) in the same edit, with a real translation, not English copied over
- Colour inputs use `src/components/common/ColorSwatchPicker.vue` (Naive UI picker whose popover stays inside the window), not `<input type="color">`, whose native popup can open off-screen. Exception: the inline text toolbar (`TextFormatToolbar.vue`) keeps native inputs, because focus moving into a page popover would drop the text selection being formatted.
- Default report font: DejaVu Sans (`DEFAULT_REPORT_FONT` in `src/config/fonts.config.ts`), bundled in `public/fonts/dejavu/` and shipped with JasperReports
- JRXML namespace: `http://jasperreports.sourceforge.net/jasperreports`
- Element UUIDs required by JasperReports XSD
- **Undo/redo** (`src/composables/useUndoRedo.ts`) snapshots the whole model. Every editor change must take a snapshot **before** mutating: `saveStateToHistory()` in `PDFDesigner.vue`, `emit("save-state")` from property panels. One user action = one undo step: record once per action (not once per side or per keystroke; see `recordBorderEdit` in `ElementProperties.vue`), and for drags/resizes record at the start, not on mouse-up. New features must be checked with Ctrl+Z / Ctrl+Y.
