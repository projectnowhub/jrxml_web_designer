# CDP Report Studio (JRXML Web Designer)

A browser-based visual designer for JasperReports templates (JRXML), part of ProjectNow CDP. Users sign in with their tenant, design a report on a drag-and-drop canvas, fill tables from backend data without writing expressions, preview the PDF, and download the JRXML. A desktop build (Tauri) is also available.

## Features

### Workspace
- Sign-in with your tenant URL (OAuth 2.0 + PKCE), also from the desktop app
- Home page with recent templates and "Create a new template"; My Templates, Activity and My Profile pages (being built)
- English and Malay (EN / BM switch on the login page, home header and editor header)

### Designer
- **Pages**: multiple pages per report ("Add page after"), each a Detail section; Page Header, Column Header, Column Footer and Page Footer bands; a Background band for the page border. No Title or Summary sections
- **Element library**
  - Basic: Text, Image, Line, Rectangle, Ellipse, Box, Table, Chart, Barcode
  - Composite: Page Border, Page Number (simple, "Page X", "Page X of Y"…, with page ranges)
  - Element presets: Number Box, Alert Box, Section Box, Photo Box
- **Data tables**: drag a source (e.g. Procurement, Products) from "Table Data" onto a table, then pick columns, rename headers, filter and sort like a shop's filter panel (tick values, price-style ranges, one sort), limit rows and add totals. Table styles: built-in Corporate Blue, Minimal and Emerald, customize any table, and save a look as your own table style to reuse. Several independent tables per report; rows are fetched from the backend each time
- **Styling**: fonts, colours, borders per side (Solid, Dashed, Dotted, Double), rounded corners per corner, padding
- **Text**: inline rich-text editing with a formatting toolbar, fit-to-text
- **Images**: upload, crop, rounded corners
- **Layout**: grid, snap to grid and to alignment guides, rulers, zoom, multi-select with align and distribute, copy/paste, undo/redo (`Ctrl+Z` / `Ctrl+Y`)
- **AI Assistant**: a chat panel that edits the design through tools (create, move, resize, align, style elements, add fields…)
- **Auto-save** in the browser

### JRXML and preview
- Live JRXML in the bottom panel: edit, Apply, Format, Copy, Download
- **Validate XSD** against the JasperReports 6.21.5 schema, with **Auto Fix**
- **Preview PDF** on the report server, with each table's rows; the preview window shows the tables read-only and links back to the designer
- Import JRXML from JasperReports / Jaspersoft Studio (unsupported parts such as subreports and crosstabs are dropped)

## Getting started

```bash
pnpm install
cp .env.example .env     # then fill in the values (see below)
pnpm dev                 # http://localhost:1420
```

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Type check (`vue-tsc`) + production build |
| `pnpm preview` | Serve the production build |
| `pnpm tauri:dev` / `pnpm tauri:build` | Desktop app |
| `pnpm release` | Bump the version, build, commit |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_OAUTH_BASE_URL`, `VITE_OAUTH_CLIENT_ID`, `VITE_OAUTH_AUTH_URL`, `VITE_OAUTH_TOKEN_URL`, `VITE_OAUTH_USER_URL`, `VITE_OAUTH_LOGOUT_URI` | Sign-in (OAuth). The base URL also serves image uploads |
| `VITE_PDF_PREVIEW_API` | Report server used by Preview PDF |
| `VITE_DATA_SOURCE_API` | Backend for table data. Empty: built-in dummy data |
| `VITE_AI_API_ENDPOINT`, `VITE_AI_MODEL_NAME`, `VITE_AI_MAX_TOKENS`, `VITE_AI_TEMPERATURE` | AI Assistant (any OpenAI-compatible API) |

`VITE_` values are compiled into the JavaScript sent to browsers, so never put a secret key in them. The AI key should move behind a backend proxy.

## Documentation

| Document | Contents |
|----------|----------|
| [CLAUDE.md](CLAUDE.md) | Rules and conventions for working on the code (boxes, tables, styles, undo, icons, i18n, JRXML validity) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app is built: folders, data flow, components, services |
| [docs/JRXML_REFERENCE.md](docs/JRXML_REFERENCE.md) | JRXML elements, attributes and order |
| [docs/VALIDATION.md](docs/VALIDATION.md) | How to check JRXML, validation tools, schema findings |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker image, Kubernetes, GitHub deploy workflow |

## Tech stack

Vue 3 + TypeScript + Vite, Naive UI, vue-i18n, CodeMirror, Lucide icons, Tauri 2. JRXML targets JasperReports 6.21.5.

## License

MIT (see [LICENSE](LICENSE)). Based on the open-source [JRXML Web Designer](https://github.com/fengyunhe/jrxml_web_designer). JasperReports is a trademark of Jaspersoft Corporation.
