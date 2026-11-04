# Report bands and the report engine: generating reports on the server

> **Status (2026-11-03).** Agreed design; the backend endpoints don't exist
> yet. The designer builds each template's **report bands**
> (`src/utils/reportBands.ts`, types `src/types/reportBands.ts`) and shows
> them, with the Jmix report the server is to store
> (`src/utils/jmixReportStructure.ts`, `src/types/jmixReport.ts`), in the
> dev-only **Report Bands** tab of the bottom panel (Bands / Sent / Stored,
> Copy). details.json is gone. Until the server stores and runs the bands,
> Preview PDF still posts the JRXML to `generateForm` with each data table's
> first 10 rows as `subDataSources` (temporary), and linked details print
> their parameters' defaults.

Each template is stored on the report server as a **Jmix report** (the
Jmix Reports add-on, 3.0.1, already a dependency of cdp-report-addon). Its
**bands** say where every part of the template's data comes from; the server
loads the data itself when the report runs, for any project and any day. The
JRXML is not changed: a custom template class fills it with the bands' data.

```
DESIGNER                                   REPORT SERVER (CDP backend + cdp-report-addon)
design changes → buildReportBands()  → Report Bands tab
template saved (2 s after the last change)
PUT /v2/api/reporter/templates/{id}  ───→  check the bands → build the Jmix report → save
  { name, version, jrxml, bands }           REPORT_REPORT.xml = structure JSON, REPORT_TEMPLATE.content = JRXML
 ←── { id, reportCode, version, structure }

Preview PDF / any run:
POST /rest/reports/run/code/{reportCode} ─→ ReportRunner → each band's Groovy data set
  { template, parameters }                    → cdp_ReportBandLoader (DataManager: the same code
                                                as /v2/table and /v2/analytics/aggregate)
                                             → CdpJasperReport.createReport(rootBand): fills the JRXML
 ←── application/pdf
```

## 1. The template as a Jmix report

### What Jmix gives and what is missing (checked in the 3.0.1 jars)

- **Storage.** One `report_Report` row (name, `code`, group, `restAccess`,
  `sysTenantId`, `xml`). Bands, data sets and input parameters are not
  tables: `ReportsSerialization` (Gson) writes them as one JSON text into the
  `xml` column, every value a string, enums as ids, every object with
  `metaClass` + `id`. The template file is a `report_Template` row
  (`content` = the JRXML bytes).
- **Reports REST** (`/rest/reports`, OAuth2 `rest-api` scope): `GET /report`,
  `GET /report/{id}`, `GET /group/{id}`, `POST /run/{id}`,
  `POST /run/code/{code}`. **No create / update / delete**: the CRUD below is
  ours. Run parameters are matched by alias (an ENTITY takes its id, a DATE
  `yyyy-MM-dd`); a report needs `restAccess`, the user the `report-run-api` role.
- **A run over REST, exactly** (`ReportRestControllerManager`, checked in the
  jar). It runs only a **saved** report: no JRXML goes in the request, so the
  template must be saved (PUT) before every Preview PDF. Parameter defaults
  are **not** applied over REST (only the Jmix run dialog uses them): a
  missing required parameter is `400 { "error": "Run report error",
  "details": "Required report parameter \"project\" not found" }`, so the
  designer always sends `project` and `reportDate`. An ENTITY value is loaded
  with the `_instance_name` fetch plan after a read-permission check on
  `cdp_Project` (the band loader reloads the project by id); a DATE value is
  parsed `yyyy-MM-dd` into a `java.sql.Date`. The answer is the file's bytes,
  `Content-Type: application/pdf` (from the template's output type),
  `Content-Disposition: inline` (`"attachment": false`) with the report's name;
  errors are `{ error, details }` with 400 (bad body / parameters), 403, 404
  (no report with that code the user may run: `restAccess` off, or the
  report's Roles tab names roles the user hasn't), 500 (the fill failed).
- **generateForm goes away with it.** Its pipeline (`fixJrxmlContent`,
  `convertBase64Images`, compile, fill, PDF, the fonts) moves into
  `CdpJasperReport`, with each table's rows from its band in place of
  `applySubDataSources`. The designer's Preview PDF and AI `check_pdf` switch
  to save + run once PUT, the band loader and `CdpJasperReport` exist; until
  then they keep `generateForm`.
- **Why Groovy data sets, not JPQL.** JPQL data sets run on the raw
  `EntityManager`: no row-level security (the Jmix docs say so), no
  user-defined fields (dynamic attributes), no `_instanceName`, no row limit.
  A Groovy data set gets `params`, `parentBand`, `dataManager`,
  `applicationContext`, `currentAuthentication`, `reportQuery`
  (`jmix.reports.groovy-enabled` is true by default).
- **Why a custom template, not Jmix's Jasper template type.** Jmix's
  `JasperFormatter` fills with `JRBandDataDataSource(rootBand)` as the main
  data source (every band row, depth first, is one record, so the designer's
  pages, written as Detail bands, would print once per row) and passes only
  `$P{REPORTING}` (no input parameters, so `$P{cdp_project_*}` stays empty).
  A template with `custom=true`, `customDefinedBy=CLASS` (100) and
  `customDefinition` = a class implementing
  `CustomReport.createReport(report, rootBand, params)` receives the whole
  loaded band tree and returns the PDF.

### The report the server stores for a template

| Part | Value |
|---|---|
| `id` | the designer's template id (a UUID) |
| `code` | `cdp-tpl-<id>` |
| group | code `CDP_REPORT_STUDIO`, title "CDP Report Studio" |
| `restAccess` | true |
| input parameter `project` | ENTITY (30) `cdp_Project`, required, default = the template's project |
| input parameter `reportDate` | DATE (10), required, `defaultDateIsCurrent` (moving date ranges are worked out from it) |
| bands | `Root`, and under it one band per entry of `bands` (below), `orientation` 0, `position` = order |
| each band's data set | GROOVY (30), `text` always `return applicationContext.getBean('cdp_ReportBandLoader').load(reportQuery, params)`, the band's request (its entry without `name`) as JSON in `jsonSourceText` |
| template | code `DEFAULT`, `<name>.jrxml`, PDF (20), custom, CLASS (100), `com.ipectechnologies.cdpreportaddon.report.CdpJasperReport` |

(If `reportQuery` in the Groovy binding turns out not to be the `DataSet`,
the request goes inside the Groovy text instead.)

### The bands (`ReportBandsPayload`, `src/types/reportBands.ts`)

| Band name | `kind` | One per | Rows | Fills in the JRXML (`fills`) |
|---|---|---|---|---|
| `project` | `projectValues` | template, when a detail is linked | 1 | the String parameters `cdp_project_*`, `cdp_location_*`, `cdp_udf_*` |
| the table's `datasetName` (`table_xxxxxx`) | `entityRows` | data table | N (≤ `maxRows`, 5,000) | that table's `<subDataset>` |
| the table's `datasetName` | `projectList` | list table (manager, team, companies, contracts) | N | that table's `<subDataset>` |
| `chart_<uuid, - → _>` | `aggregate` | chart (set up) | 1 (the answers) | the chart `<image>` (`chartSvg`) |
| `map_<uuid, - → _>` | `map` | Location following the project | 1 | the map `<image>` and the address text field |

Band names use only Latin letters, digits and `_` (a Jmix rule). Text in
`{{…}}` is filled in for each run: `{{projectId}}` from `project`, and
`{{thisMonth.from}}`, `{{thisMonth.to}}`, `lastMonth`, `thisQuarter`,
`thisYear`, `last30Days` from `reportDate`, with the rules of `periodRange`
in `src/utils/table/dataBinding.ts`.

**The browser never sends query text, and never the project condition.**
The server checks entity names, properties and operators against Jmix
`Metadata` and a list of allowed operators, keeps `maxRows` ≤ 5,000, accepts
only the kinds above, and adds the project condition itself: `entityRows` /
`aggregate` carry `source.projectProperty` (`project.id`, or
`contract.project.id` for payments, variation orders, final accounts, LAD),
compared with `project`.

How the loader reads each kind:

- `projectValues`: the project (`source.id`, fetch plan `project-details-fp`,
  dynamic attributes) → one row, a value per field: `path` / `paths` +
  `separator`, `format` `label` (`labels`), `date` (Java `pattern`, English
  month names), `html` (plain text, a line per paragraph), `amount`
  (`decimals`); `dynamicAttribute` = the `value` of the project's
  `dynamicAttr` with that code.
- `entityRows`: the records of `source.entity` in the project, as
  `GET /v2/table/{entity}` reads them (fetch plan, dynamic attributes), the
  project condition AND `filter` (Jmix conditions: `in`, `contains`, `=`
  with a boolean, `>=` / `<=`), `sort` (none: newest first), at most
  `maxRows`; only the `fields`; a `linked` field prints the record's
  `_instanceName`.
- `projectList`: the project's own list `list` (`single`: one record, the
  project manager) → a row per item, a value per field as above.
- `aggregate`: one `POST /v2/analytics/aggregate` per entry of `requests`
  (with the project as `globalFilter`) → one row `{ resultsJson }`, the
  answers in order; drawn with the engine's `chartSvg(chart, resultsJson, …)`.
- `map`: the project's coordinates (`latitudePath`, `longitudePath`) and
  address lines (each line's non-empty values joined by its separator, empty
  lines dropped, lines joined by `lineSeparator`) → one row
  `{ latitude, longitude, address }`; the map picture is drawn on the server.

### API (the backend writes the CRUD; Jmix runs)

Same bearer token and `tenantId` header as the rest of the CDP API.

| Method | Path | What |
|---|---|---|
| GET | `/v2/api/reporter/templates?page&size&q&sort&dir` | `{ items, total }` (the contract in `src/services/templateService.ts`) |
| GET | `/v2/api/reporter/templates/{id}` | name, jrxml, version, structure |
| PUT | `/v2/api/reporter/templates/{id}` | create or update: `{ name, version, jrxml, bands }` → `{ id, reportCode, version, updatedAt, structure }`; `400 { error: "invalidBand", band, message }`, `409 { error: "versionConflict", version }` |
| DELETE | `/v2/api/reporter/templates/{id}` | the report and its template file |
| GET | `/v2/api/reporter/templates/{id}/bands` | the stored structure |
| POST | `/rest/reports/run/code/{reportCode}` | Jmix: `{ "template": "DEFAULT", "attachment": false, "parameters": [{ "name": "project", "value": "<project id>" }, { "name": "reportDate", "value": "2026-11-03" }] }` → the PDF |

A save's `bands`, for example (the Report Bands tab's **Sent** view shows a
template's real one):

```json
{
  "parameters": [
    { "alias": "project", "name": "Project", "type": "ENTITY", "entity": "cdp_Project", "required": true, "defaultValue": "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
    { "alias": "reportDate", "name": "Report date", "type": "DATE", "required": true, "defaultIsToday": true }
  ],
  "bands": [
    { "name": "project", "kind": "projectValues", "label": "Project details",
      "fills": { "parameters": ["cdp_project_name", "cdp_project_status"] },
      "source": { "entity": "cdp_Project", "id": "{{projectId}}", "fetchPlan": "project-details-fp", "dynamicAttributes": true },
      "fields": [
        { "name": "cdp_project_name", "path": "projectTitle" },
        { "name": "cdp_project_status", "path": "status", "format": "label", "labels": { "ACTIVE": "Active", "ON_HOLD": "On hold" } } ] },
    { "name": "table_3f9a1c", "kind": "entityRows", "label": "Table 1 · Procurement Register",
      "fills": { "subDataset": "table_3f9a1c" },
      "source": { "entity": "cdp_ProcurementRegister", "projectProperty": "project.id", "fetchPlan": "procurementRegister-list-fp", "dynamicAttributes": true },
      "fields": [ { "name": "title" }, { "name": "contract", "linked": true }, { "name": "amount" } ],
      "filter": { "group": "AND", "conditions": [
        { "property": "status", "operator": "in", "value": ["PENDING", "APPROVED"] },
        { "property": "orderDate", "operator": ">=", "value": "{{thisMonth.from}}" },
        { "property": "orderDate", "operator": "<=", "value": "{{thisMonth.to}}" } ] },
      "sort": [ { "property": "amount", "desc": true } ],
      "maxRows": 5000 }
  ]
}
```

The **Stored** view shows the matching `REPORT_REPORT.xml` JSON (with fixed
ids: the server gives its own).

### The server classes (cdp-report-addon)

- `CdpReportTemplateController` (`/v2/api/reporter/templates`): the CRUD
  above, secured (today `/v2/api/pdf/**` is `permitAll`).
- `CdpReportTemplateService.save(id, request)`: check the bands, build the
  report (`metadata.create(Report.class)`, Root + child bands, data sets,
  input parameters, template), `report.setXml(reportsSerialization.convertToString(report))`,
  save, return the structure.
- `cdp_ReportBandLoader`: `List<Map<String,Object>> load(ReportQuery query, Map<String,Object> params)`:
  reads `((DataSet) query).getJsonSourceText()`, fills in the placeholders,
  loads by `kind` through `DataManager` (the user's security applies).
- `CdpJasperReport implements CustomReport`: the JRXML from the template,
  then the existing steps (`fixJrxmlContent`, `convertBase64Images`): the
  `project` row as fill parameters, each table's band as its dataset (a fill
  parameter, instead of the static `SUB_DATASOURCES` map, which never empties
  and isn't thread-safe), charts redrawn with the engine (below), maps;
  `JREmptyDataSource(1)` as the main data source; PDF bytes. Jmix makes it
  with its no-argument constructor (not a Spring bean): reach beans through a
  static `ApplicationContext` holder.
- `/rest/reports/**` needs Jmix REST and an OAuth2 resource server in the CDP
  backend.

## 2. What is in the JRXML

Unchanged by the bands: the server reads the data from the bands, the JRXML
still carries each element's setup (the designer reads it back when a
template is opened).

### Charts

```xml
<image scaleImage="RetainShape" hAlign="Center" vAlign="Middle">
  <reportElement x="20" y="40" width="515" height="260" uuid="…">
    <property name="com.cdp.chart.binding" value="{…chart setup JSON…}"/>
  </reportElement>
  <imageExpression><![CDATA["data:image/svg+xml;base64,PHN2Zy…"]]></imageExpression>
</image>
```

The chart's band carries the same setup as `chart` (`ChartBinding`,
`src/types/dataSource.ts`, with `projectId` `{{projectId}}` and without its
filters, which are already in the requests).

### Tables

```xml
<componentElement>
  <reportElement … uuid="…">
    <property name="com.cdp.table.binding" value="{…table setup JSON…}"/>
  </reportElement>
  <jr:table …>
    <datasetRun subDataset="table_ab12cd" …> … </datasetRun>
    …
  </jr:table>
</componentElement>
```

The `<subDataset name>` is the table's band name: its rows fill it. A column
with `"linked": true` is a link to another record: its cell prints the
record's `_instanceName`. Text cells need nothing from the server beyond the
raw values: their expressions print a yes / no field (a `Boolean`) as Yes /
No, a choice field as its words ("PENDING" → "Pending"), and other text
without HTML tags (a line per paragraph). Dates print `dd MMM yyyy` in
English; a Count total counts every row. A table with no data set up is
written as an empty `<frame>` with an empty property value, and has no band.

### Filters (in the table and chart setups)

| Filter | Stored as | In the band's request |
|---|---|---|
| Ticked values | `{ "column", "operator": "in", "values": [...] }` | `in` |
| Range | `{ "column", "operator": "between", "value", "value2" }` (either end optional) | `>=` / `<=` |
| Typed words | `{ "column", "operator": "contains", "value": "permit" }` | `contains` |
| Yes / No | `{ "column", "operator": "equals", "value": "true" }` | `=` with a boolean |
| Moving date range | `{ "column", "operator": "between", "period": "thisMonth" }` | `>=` `{{thisMonth.from}}`, `<=` `{{thisMonth.to}}` |

## 3. The engine

Build it from this repo:

```bash
npm run build:engine     # → dist-engine/cdp-report-engine.js  (~580 KB, ~200 KB gzipped)
```

Copy that file into the backend at
`cdp-report-addon/src/main/resources/report-engine/cdp-report-engine.js`
whenever the chart or table code changes. It defines one global,
`CdpReportEngine`:

| Function | Arguments | Returns |
|---|---|---|
| `ENGINE_VERSION` | – | number (now `11`: `tableQuery` returns `"null"` for a project list table (`"list"`: manager, team, companies or contracts; its rows are the project record's own list, not a backend table); `10`: choice values get the CDP dashboards' colours (`choices[].color`) and date buckets read "Apr 1, 2024", as the CDP app; `9`: every category is shown (no "largest N" / "Other", as the CDP app); `8`: every date on the axis is labelled (slanted when needed) and split lines / bars keep the backend's order, as the CDP app; `7`: charts are drawn like the CDP app's: one colour per series, smooth lines, the description (`note`) under the title; `6`: a chart may carry `colors` (a colour of its own per value) and a `note` printed under it; `5`: a chart grouping may carry `choices` and `yesNo`, so its categories print "Pending" / "Yes" and choice fields keep their own order on bar, line and area charts; `4`: a date range's end was briefly sent as `<` the next day, back to `<=` in 5; `3`: no row limit, columns may be `linked`; `2`: filters may be `contains` or `equals`), bumped when a function's arguments or results change |
| `LOCALES` | – | languages charts can print in: `["en", "ms"]` |
| `chartRequests(bindingJson, todayIso)` | chart setup JSON; run date `"2026-11-15"` | JSON array of `AggregateRequest`s; `"[]"` when the chart isn't set up (it prints nothing) |
| `chartSvg(bindingJson, resultsJson, width, height, locale, fontName?)` | setup; JSON array of the `AggregateResult`s, **in the same order as the requests**; the image's width and height from `<reportElement>`; `"en"` / `"ms"`; font (default Noto Sans SC) | SVG text; `""` when the chart isn't set up |
| `tableQuery(bindingJson, todayIso)` | table setup JSON; run date | JSON `{ projectId, sourceId, datasetName, query }`, or `"null"` when the table has no data set up |

All arguments and results are strings or numbers. The engine uses no browser
features, no network and no Java access: Java makes every HTTP call.

With the report bands, the server needs only `chartSvg`: a chart's requests
are already in its band (`requests`, the loader fills in the placeholders)
and a table's request is its `entityRows` band. `chartRequests` and
`tableQuery` (which still answers in the old data-source shape) are kept
until the backend runs the bands.

## 4. Java

Dependencies (`cdp-report-addon.gradle`; checked with 24.2.2, pin one version
for all):

```gradle
implementation 'org.graalvm.polyglot:polyglot:24.2.2'
implementation 'org.graalvm.polyglot:js-community:24.2.2'
```

Running the engine:

```java
@Service
public class ReportEngine {
    // One Engine for the application: it keeps the parsed engine file, so
    // only the first chart is slow
    private final Engine engine = Engine.newBuilder()
            .option("engine.WarnInterpreterOnly", "false").build();
    private final Source source;

    public ReportEngine() throws IOException {
        try (InputStream in = new ClassPathResource("report-engine/cdp-report-engine.js").getInputStream()) {
            source = Source.newBuilder("js", new String(in.readAllBytes(), StandardCharsets.UTF_8),
                    "cdp-report-engine.js").build();
        }
    }

    public String call(String function, Object... args) {
        // A fresh Context per call: Contexts must not be shared between threads
        try (Context ctx = Context.newBuilder("js").engine(engine).allowAllAccess(false).build()) {
            ctx.eval(source);
            return ctx.getBindings("js").getMember("CdpReportEngine")
                    .getMember(function).execute(args).asString();
        }
    }
}
```

Drawing a chart in `CdpJasperReport` (before `convertBase64Images`), from its
band's row (`resultsJson`: the answers in the order of the band's `requests`):

```java
for (JRDesignImage image : allImages(design)) {          // bands and frames
    String setup = image.getPropertiesMap().getProperty("com.cdp.chart.binding");
    BandData row = rootBand.findBandRecursively("chart_" + image.getUUID().toString().replace('-', '_'));
    if (setup == null || row == null) continue;           // no band: keeps the saved picture
    try {
        String results = (String) row.getData().get("resultsJson");
        String svg = engine.call("chartSvg", setup, results, image.getWidth(), image.getHeight(), locale);
        if (!svg.isEmpty()) image.setExpression(dataUri(svg));
    } catch (Exception e) {
        log.warn("Chart {} not refreshed; printing the saved picture", image.getUUID(), e);
    }
}
```

Tables: Jmix puts one `BandData` per row under the root, named after its
band. Each `<jr:table>` whose `datasetRun subDataset` names a band gets
`rootBand.getChildrenByName(datasetName)` rows' `getData()` as a
`JRMapCollectionDataSource`, passed as a fill parameter and used as the
dataset run's `dataSourceExpression` (instead of the static
`SUB_DATASOURCES` map). The `project` band's single row
(`rootBand.findBandRecursively("project").getData()`) gives the fill's
`cdp_*` parameters.

## 5. Fallback

The designer still writes each chart's picture (drawn with the numbers it had
when the JRXML was written) into the `<imageExpression>`. If the server can't
refresh a chart (API down, timeout, engine error), it prints that picture
instead of an empty space. A table whose rows can't be fetched prints its
"no rows" cell.

## 6. Checked

- The engine file runs in GraalJS 24.2.2 (Java 21, interpreter mode, no
  GraalVM JIT): first chart ~3.5 s (engine start), after that ~0.2 s per
  chart. A GraalVM JDK (with the JIT compiler) is faster.
- The SVG from GraalJS is the same as the designer's (only internal class
  names differ) and prints in a JasperReports 6.21 PDF through Batik, as
  `PdfGenerationController` prints images today.
- `tableQuery` and `chartRequests` turn moving date ranges into dates for the
  given day (e.g. `lastMonth` on 2026-11-15 → 2026-10-01 … 2026-10-31).

## 7. To decide on the backend

- **Login on scheduled runs.** `/v2/analytics/aggregate` and the source query
  use the signed-in user's login. A run without a user needs a service
  account, and a decision on whose data permissions apply.
- **Language.** Charts print month names and "Other" in `en` or `ms`; use the
  user's language, or `en` for scheduled runs.
- **Limits.** A timeout per request (a few seconds), a cap on charts and
  tables per report, and maximum image size.
- **`ExportService.export()`** (`/export`, `/pdf`…) doesn't call
  `convertBase64Images()`, so charts and images break there today; it needs
  the same steps as `PdfGenerationController`.
