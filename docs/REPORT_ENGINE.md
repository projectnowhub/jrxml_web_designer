# Report engine: generating reports from the JRXML alone

The designer sends the report server **only the JRXML**. Table rows and chart
numbers are never sent: the server fetches them itself, using the setups the
designer writes into the JRXML. To build exactly the same requests and the
same chart pictures as the designer, the server runs the designer's own code:
the **report engine**, one JavaScript file run in GraalJS inside the JVM.

```
Designer ── POST {PDF_PREVIEW_API}/api/pdf/generateForm   form field: jrxml (only)
                                   │
Report server (Java)               ▼
  1. JRXmlLoader.load(jrxml)
  2. Tables: every <jr:table> with com.cdp.table.binding
       engine.tableQuery(binding, today)      → { projectId, sourceId, datasetName, query }
       POST {DATA_SOURCE_API}/projects/{projectId}/sources/{sourceId}/query  body: query
       rows → the table's dataset (as applySubDataSources does today)
  3. Charts: every <image> with com.cdp.chart.binding
       engine.chartRequests(binding, today)   → [AggregateRequest, …]
       POST {CDP}/v2/analytics/aggregate for each, answers in the same order
       engine.chartSvg(binding, answers, width, height, locale) → SVG text
       image expression := "data:image/svg+xml;base64," + Base64(SVG)
       on any error: keep the image already in the JRXML (see "Fallback")
  4. convertBase64Images() → compile → fill → PDF (as today)
```

## 1. What is in the JRXML

### Charts

```xml
<image scaleImage="RetainShape" hAlign="Center" vAlign="Middle">
  <reportElement x="20" y="40" width="515" height="260" uuid="…">
    <property name="com.cdp.chart.binding" value="{…chart setup JSON…}"/>
  </reportElement>
  <imageExpression><![CDATA["data:image/svg+xml;base64,PHN2Zy…"]]></imageExpression>
</image>
```

The chart setup (`ChartBinding`, `src/types/dataSource.ts`), for example:

```json
{
  "chartType": "bar", "title": "Spend by month",
  "projectId": "kl-metro", "sourceId": "procurement", "entityName": "Procurement",
  "dimension": { "column": "order_date", "label": "Order Date", "type": "date", "granularity": "month" },
  "series": [ { "measure": { "aggregation": "sum", "column": "amount", "columnLabel": "Amount" } } ],
  "filters": [ { "column": "order_date", "operator": "between", "period": "thisYear" } ],
  "palette": "vivid", "showLegend": true
}
```

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

The table setup (`TableDataBinding`): project, source, columns, filters, one
sort, `datasetName` (also the `<subDataset name>` its cells read). There is no
row limit: a table prints every matching row. A column with `"linked": true` is
a link to another record (an `ENTITY` field, e.g. a row's `contract`): the row
holds that record as an object, and its cell must print the record's
`_instanceName` (the designer shows the same), never the object itself.
Text cells need nothing from the server beyond the raw values: their
expressions print a yes / no field (a `Boolean`) as Yes / No, a choice field
(`"choices"` on the column) as its words ("PENDING" → "Pending"), and other text
without HTML tags (a line per paragraph). Dates print `dd MMM yyyy` in English;
a Count total counts every row.
A table with no data set up is written as an empty `<frame>` with an empty
property value: skip it.

### Filters

Filters are part of both setups and are never resolved in the JRXML:

| Filter | Stored as | Meaning |
|---|---|---|
| Ticked values | `{ "column", "operator": "in", "values": ["Approved", "Pending"] }` | cell equals one of them (case-insensitive) |
| Range | `{ "column", "operator": "between", "value": "2026-01-01", "value2": "2026-03-31" }` | value ≤ cell ≤ value2, either end optional (`>=` / `<=`, dates too, as the CDP app's `buildJmixFilter`) |
| Typed words (version 2) | `{ "column", "operator": "contains", "value": "permit" }` | the text cell contains the words (any case); a Jmix `contains` condition, as the CDP app's text filters |
| Yes / No (version 2) | `{ "column", "operator": "equals", "value": "true" }` | a yes / no field is true (`"false"`: false); a Jmix `=` condition with a boolean, as the CDP app's checkbox |
| Moving date range | `{ "column", "operator": "between", "period": "thisMonth" }` | `thisMonth`, `lastMonth`, `thisQuarter`, `thisYear`, `last30Days`, worked out **on the day the report runs** |

Don't interpret filters in Java: pass the setup and the run date to the
engine, and it returns requests with the dates already filled in.

## 2. The engine

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
| `ENGINE_VERSION` | – | number (now `10`: choice values get the CDP dashboards' colours (`choices[].color`) and date buckets read "Apr 1, 2024", as the CDP app; `9`: every category is shown (no "largest N" / "Other", as the CDP app); `8`: every date on the axis is labelled (slanted when needed) and split lines / bars keep the backend's order, as the CDP app; `7`: charts are drawn like the CDP app's: one colour per series, smooth lines, the description (`note`) under the title; `6`: a chart may carry `colors` (a colour of its own per value) and a `note` printed under it; `5`: a chart grouping may carry `choices` and `yesNo`, so its categories print "Pending" / "Yes" and choice fields keep their own order on bar, line and area charts; `4`: a date range's end was briefly sent as `<` the next day, back to `<=` in 5; `3`: no row limit, columns may be `linked`; `2`: filters may be `contains` or `equals`), bumped when a function's arguments or results change |
| `LOCALES` | – | languages charts can print in: `["en", "ms"]` |
| `chartRequests(bindingJson, todayIso)` | chart setup JSON; run date `"2026-11-15"` | JSON array of `AggregateRequest`s; `"[]"` when the chart isn't set up (it prints nothing) |
| `chartSvg(bindingJson, resultsJson, width, height, locale, fontName?)` | setup; JSON array of the `AggregateResult`s, **in the same order as the requests**; the image's width and height from `<reportElement>`; `"en"` / `"ms"`; font (default Noto Sans SC) | SVG text; `""` when the chart isn't set up |
| `tableQuery(bindingJson, todayIso)` | table setup JSON; run date | JSON `{ projectId, sourceId, datasetName, query }`, or `"null"` when the table has no data set up |

All arguments and results are strings or numbers. The engine uses no browser
features, no network and no Java access: Java makes every HTTP call.

## 3. Java

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

Refreshing the charts (before `convertBase64Images`):

```java
for (JRDesignImage image : allImages(design)) {          // bands and frames
    String setup = image.getPropertiesMap().getProperty("com.cdp.chart.binding");
    if (setup == null) continue;
    try {
        String today = LocalDate.now(zone).toString();
        JSONArray requests = new JSONArray(engine.call("chartRequests", setup, today));
        if (requests.isEmpty()) continue;                 // not set up: prints nothing
        JSONArray answers = new JSONArray();
        for (int i = 0; i < requests.length(); i++) {
            answers.put(analytics.aggregate(requests.getJSONObject(i)));   // unwrap { data } if wrapped
        }
        String svg = engine.call("chartSvg", setup, answers.toString(),
                image.getWidth(), image.getHeight(), locale);
        if (!svg.isEmpty()) image.setExpression(dataUri(svg));
    } catch (Exception e) {
        log.warn("Chart {} not refreshed; printing the saved picture", image.getUUID(), e);
    }
}
```

Tables (replacing the rows the designer used to send, `subDataSources`):

```java
for (TableComponent table : allTables(design)) {
    String setup = propertyOf(table, "com.cdp.table.binding");
    if (setup == null || setup.isEmpty()) continue;
    JSONObject spec = new JSONObject(engine.call("tableQuery", setup, today));   // "null" → skip
    List<Map<String, Object>> rows = dataSource.query(spec.getString("projectId"),
            spec.getString("sourceId"), spec.getJSONObject("query"));        // response: { rows, totalCount }
    subDataSources.put(spec.getString("datasetName"), rows);
}
applySubDataSources(design, parameters, subDataSources);  // existing code
```

## 4. Fallback

The designer still writes each chart's picture (drawn with the numbers it had
when the JRXML was written) into the `<imageExpression>`. If the server can't
refresh a chart (API down, timeout, engine error), it prints that picture
instead of an empty space. A table whose rows can't be fetched prints its
"no rows" cell.

## 5. Checked

- The engine file runs in GraalJS 24.2.2 (Java 21, interpreter mode, no
  GraalVM JIT): first chart ~3.5 s (engine start), after that ~0.2 s per
  chart. A GraalVM JDK (with the JIT compiler) is faster.
- The SVG from GraalJS is the same as the designer's (only internal class
  names differ) and prints in a JasperReports 6.21 PDF through Batik, as
  `PdfGenerationController` prints images today.
- `tableQuery` and `chartRequests` turn moving date ranges into dates for the
  given day (e.g. `lastMonth` on 2026-11-15 → 2026-10-01 … 2026-10-31).

## 6. To decide on the backend

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
