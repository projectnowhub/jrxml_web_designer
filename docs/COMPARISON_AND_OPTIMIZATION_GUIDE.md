# JRXML Web Designer vs Jaspersoft Studio 6 Feature Comparison and Optimization Guide

## 📋 Document Overview

This document compares the feature differences between the current **JRXML Web Designer** (web version) and the official **Jaspersoft Studio 6** (Eclipse desktop version), and provides recommendations for future optimization directions.

---

## I. Feature Comparison

### 1.1 Supported Element Types

| Element Type | Official Studio 6 | Current Web Version | Gap Notes |
|---------|:------------:|:----------:|---------|
| Static Text | ✅ | ✅ | Fully functional |
| Text Field | ✅ | ✅ | Fully functional |
| Image | ✅ | ✅ | Fully functional |
| Line | ✅ | ✅ | Fully functional |
| Rectangle | ✅ | ✅ | Fully functional |
| Ellipse | ✅ | ✅ | Fully functional |
| Break | ✅ | ✅ | Fully functional |
| Frame | ✅ | ✅ | Fully functional |
| Table | ✅ | ✅ | Fully functional |
| **List** | ✅ | ❌ | **Missing** |
| **Chart** | ✅ | ❌ | **Missing, supports 30+ chart types** |
| **Crosstab** | ✅ | ❌ | **Missing** |
| **Subreport** | ✅ | ❌ | **Missing** |
| **Barcode** | ✅ | ❌ | **Missing, supports 10+ barcode types** |
| **Sparkline** | ✅ | ❌ | **Missing** |
| **Table of Contents** | ✅ | ❌ | **Missing** |
| **Map** | ✅ | ❌ | **Missing** |
| **Component (custom component)** | ✅ | ❌ | **Missing** |

### 1.2 Band Support

| Band Type | Official Studio 6 | Current Web Version | Gap Notes |
|----------|:------------:|:----------:|---------|
| Title | ✅ | ✅ | Fully functional |
| Page Header | ✅ | ✅ | Fully functional |
| Page Footer | ✅ | ✅ | Fully functional |
| Column Header | ✅ | ✅ | Fully functional |
| Column Footer | ✅ | ✅ | Fully functional |
| Detail | ✅ | ✅ | Fully functional |
| Summary | ✅ | ✅ | Fully functional |
| Last Page Footer | ✅ | ✅ | Fully functional |
| No Data | ✅ | ✅ | Fully functional |
| Background | ✅ | ✅ | Fully functional |
| **Group Header** | ✅ | ❌ | **Missing** |
| **Group Footer** | ✅ | ❌ | **Missing** |

### 1.3 Data Model Support

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| Fields | ✅ | ✅ | Fully functional |
| Parameters | ✅ | ✅ | Fully functional |
| Variables | ✅ | ✅ | Fully functional |
| SubDataset | ✅ | ✅ | Fully functional |
| Styles | ✅ | ✅ | Fully functional |
| **Query** | ✅ | ⚠️ | Partial support, basic queries only |
| **Connection/DataSource** | ✅ | ❌ | **Missing, cannot configure a data source** |
| **Sort** | ✅ | ❌ | **Missing** |
| **Filter** | ✅ | ❌ | **Missing** |

### 1.4 Property Configuration

| Property Type | Official Studio 6 | Current Web Version | Gap Notes |
|---------|:------------:|:----------:|---------|
| Font settings | ✅ | ✅ | Fully functional |
| Color/background | ✅ | ✅ | Fully functional |
| Border/Box | ✅ | ✅ | Fully functional |
| Alignment | ✅ | ✅ | Fully functional |
| Fill mode | ✅ | ✅ | Fully functional |
| **Pattern (formatting)** | ✅ | ⚠️ | Partial support |
| **Print When Expression** | ✅ | ⚠️ | Partial support |
| **Evaluation Time** | ✅ | ✅ | Fully functional |
| **Hyperlink** | ✅ | ⚠️ | Partial support |
| **Bookmark Level** | ✅ | ⚠️ | Partial support |
| **Conditional Style** | ✅ | ⚠️ | Partial support |
| **Stretch/Position Type** | ✅ | ❌ | **Missing** |
| **Is Remove Line When Blank** | ✅ | ⚠️ | Partial support |
| **Is Print Repeated Values** | ✅ | ⚠️ | Partial support |
| **Markup** | ✅ | ✅ | Fully functional |
| **Rotation** | ✅ | ⚠️ | Partial support |
| **Text Adjust** | ✅ | ⚠️ | Partial support |

### 1.5 UI/Interaction Features

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| Drag-and-drop to add elements | ✅ | ✅ | Fully functional |
| Element resizing | ✅ | ✅ | Fully functional |
| Element alignment/snapping | ✅ | ✅ | Fully functional |
| Undo/redo | ✅ | ✅ | Fully functional |
| Copy/paste | ✅ | ✅ | Fully functional |
| Multi-select | ✅ | ✅ | Fully functional |
| Canvas zoom | ✅ | ✅ | Fully functional |
| Properties panel | ✅ | ✅ | Fully functional |
| **Outline View** | ✅ | ❌ | **Missing** |
| **Palette (component panel)** | ✅ | ✅ | Basic implementation |
| **Expression Builder** | ✅ | ❌ | **Missing, requires manual input** |
| **Dataset Editor** | ✅ | ❌ | **Missing** |
| **Style Editor** | ✅ | ⚠️ | Basic implementation |
| **Grid/Snap Settings** | ✅ | ✅ | Fully functional |
| **Element Constraints** | ✅ | ❌ | **Missing, cannot set stretch/position constraints** |

### 1.5.1 Table Component Detailed Comparison

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| Basic table creation | ✅ | ✅ | Fully functional |
| Column add/remove/reorder | ✅ | ✅ | Fully functional |
| Column width adjustment | ✅ | ✅ | Fully functional |
| **Column Groups** | ✅ | ✅ | Fully functional, supports multi-level nested grouping |
| **Cell merging (rowSpan)** | ✅ | ✅ | Fully functional, correctly handles height calculation |
| Row height configuration | ✅ | ✅ | Supports 5 row-height types: tableHeader, columnHeader, detailCell, columnFooter, tableFooter |
| **Grouped-column row-height sync** | ✅ | ✅ | Automatically syncs the row height of all columns within a group |
| **Recursive height calculation for nested groups** | ✅ | ✅ | Recursively handles multi-level nested column groups |
| Table styles | ✅ | ✅ | Supports 5 table styles: Table_TH, Table_CH, Table_TD, Table_FOOTER, Table_GROUP |
| **Cell content alignment** | ✅ | ✅ | Supports horizontal and vertical alignment |
| Cell borders | ✅ | ✅ | Fully functional |
| **Dataset** | ✅ | ✅ | Supports independent dataset configuration |
| **Dynamic columns** | ✅ | ❌ | **Missing, cannot dynamically add/remove columns** |
| **Row Groups** | ✅ | ❌ | **Missing, cannot group by data** |
| **Table Calculations** | ✅ | ❌ | **Missing, cannot perform in-table calculations** |
| **Table export optimization** | ✅ | ⚠️ | Basic export support |

#### Key Technical Points for Table Handling

**1. Height Calculation Logic**
- **Base Height (single row)**: the raw, user-configured height value
- **Merged Height**: `single-row height × rowSpan`
- **Height sync**: modifying any cell's height automatically syncs all cells of the same type
- **Avoiding double calculation**: uses a `processedColumns` Set to track columns already processed

**2. JSON Data Structure**
```typescript
interface TableElement {
  columns: TableColumn[];          // flat column array
  children: (ColumnGroup | TableColumn)[]; // nested structure
}

interface TableColumn {
  uuid: string;
  width: number;
  columnHeader: {
    height: number;      // actual height after merging
    rowSpan: number;     // number of rows spanned
    element: { height: number; };
  };
  detailCell: {
    height: number;      // data-row height
    element: { height: number; };
  };
  // ... other cell types
}
```

**3. Height Handling During JRXML Generation**
```typescript
// Avoid multiplying by rowSpan more than once
const isAlreadyMerged = columnHeader.height % chRowSpan === 0;
if (!isAlreadyMerged) {
  // Still a single-row height, multiply by rowSpan
  columnHeader.height *= chRowSpan;
}
// Otherwise leave unchanged (already the correct merged height)
```

**4. Designer Canvas Rendering**
- Uses `table-layout: fixed` to prevent content from stretching columns
- Height is set entirely by inline styles from the JSON data (no reliance on CSS defaults)
- Adds `overflow: hidden` to prevent cell content from stretching row height
- Uses `vertical-align: top` to prevent table content from being vertically stretched

### 1.6 Preview and Export

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| PDF preview | ✅ | ✅ | Requires a server |
| **HTML preview** | ✅ | ❌ | **Missing** |
| **Excel export** | ✅ | ❌ | **Missing** |
| **Word export** | ✅ | ❌ | **Missing** |
| **CSV export** | ✅ | ❌ | **Missing** |
| **RTF export** | ✅ | ❌ | **Missing** |
| **ODT export** | ✅ | ❌ | **Missing** |
| **Print function** | ✅ | ❌ | **Missing** |

### 1.7 Advanced Features

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| **Subreport** | ✅ | ❌ | **Missing** |
| **Chart Wizard** | ✅ | ❌ | **Missing** |
| **Crosstab Designer** | ✅ | ❌ | **Missing** |
| **Barcode Support** | ✅ | ❌ | **Missing** |
| **Resource Bundles** | ✅ | ❌ | **Missing** |
| **Scriptlets** | ✅ | ❌ | **Missing** |
| **Custom Components** | ✅ | ❌ | **Missing** |
| **Report Templates** | ✅ | ❌ | **Missing** |
| **Style Templates** | ✅ | ⚠️ | Basic implementation |
| **Drill-Down/Drill-Through** | ✅ | ❌ | **Missing** |
| **Conditional Printing** | ✅ | ⚠️ | Partial support |
| **Group Management** | ✅ | ❌ | **Missing** |

### 1.8 File Management

| Feature | Official Studio 6 | Current Web Version | Gap Notes |
|-----|:------------:|:----------:|---------|
| JRXML import | ✅ | ✅ | Fully functional |
| JRXML export | ✅ | ✅ | Fully functional |
| **Jasper file compilation** | ✅ | ❌ | **Missing** |
| **Template save/load** | ✅ | ⚠️ | Local storage |
| **Version control integration** | ✅ | ❌ | **Missing** |
| **Multi-file project management** | ✅ | ⚠️ | Basic implementation |

---

## II. Gap Analysis Summary

### 2.1 Core Missing Features (High Priority)

1. **Chart support** — support for bar, line, pie, scatter, and 30+ other chart types
2. **Subreport** — support for nested reports, enabling complex report layouts
3. **Crosstab** — support for pivot-table-style layouts
4. **Barcode** — support for Code 128, QR Code, EAN, and 10+ other barcode types
5. ~~**Group Management**~~ — ✅ **Complete**: supports `<group>` tag parsing/generation, including groupHeader and groupFooter
6. **Expression Builder** — visual expression editing with field/parameter/variable autocomplete
7. **Multi-format export** — HTML, Excel, Word, CSV, and other export formats

### 2.2 Important Missing Features (Medium Priority)

1. **Outline View** — tree-structured display of the report's element hierarchy
2. **Data source configuration** — JDBC, XML, CSV, JavaBean, and other data source connections
3. **Sort/Filter** — data sorting and filter expression configuration
4. **Element constraints** — layout constraints such as Stretch Type and Position Type
5. **Resource Bundles** — internationalization resource management
6. **Conditional print expressions** — full support for Print When Expression
7. **Hyperlink configuration** — full support for hyperlink types and parameter configuration

### 2.3 Enhancement Features (Low Priority)

1. **Sparkline** — inline mini charts
2. **Table of Contents** — automatically generated report table of contents
3. **Map** — geographic data visualization
4. **Custom components** — user-defined report components
5. **Scriptlets** — custom Java code integration
6. **Print function** — browser print support

---

## III. Next-Step Optimization Guide

### 3.1 Phase 1: Core Capability Completion (1-2 months)

#### 3.1.1 Group Management
**Priority: 🔴 High**

```typescript
// Data structures to add
interface ReportGroup {
  name: string;
  expression: string;
  isStartNewPage: boolean;
  isRepeatHeader: boolean;
  isResetPageNumber: boolean;
  header?: Band;
  footer?: Band;
}

// Add to ReportProperties
interface ReportProperties {
  // ... existing fields
  groups: ReportGroup[];
}
```

**Implementation notes:**
- Add Group support to the type definitions
- Add a group management UI
- Support Group Header/Footer within Bands
- Add Group support to JRXML generation/parsing

#### 3.1.2 Expression Builder
**Priority: 🔴 High**

```typescript
// Expression builder component architecture
interface ExpressionBuilder {
  // Field autocomplete: $F{field_name}
  // Parameter autocomplete: $P{param_name}
  // Variable autocomplete: $V{variable_name}
  // Operators: +, -, *, /, ==, !=, <, >, &&, ||
  // Functions: IF, WHEN, SUM, COUNT, etc.
}
```

**Implementation notes:**
- Create the ExpressionBuilder component
- Integrate CodeMirror or Monaco Editor
- Implement autocomplete for fields/parameters/variables
- Add templates for common functions

#### 3.1.3 Multi-format Export
**Priority: 🔴 High**

```typescript
// Export format enum
enum ExportFormat {
  PDF = 'pdf',
  HTML = 'html',
  Excel = 'xlsx',
  Word = 'docx',
  CSV = 'csv',
  RTF = 'rtf',
  ODT = 'odt'
}
```

**Implementation notes:**
- Extend the preview server to support multiple export formats
- Add an export-format selector in the UI
- Implement client-side HTML/CSV export
- Integrate SheetJS (xlsx) for Excel export

### 3.2 Phase 2: Advanced Element Support (2-3 months)

#### 3.2.1 Chart Support
**Priority: 🟡 Medium-high**

```typescript
// Chart type enum
enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Pie = 'pie',
  Scatter = 'scatter',
  Area = 'area',
  Bubble = 'bubble',
  Candlestick = 'candlestick',
  // ... more types
}

// Chart element interface
interface ChartElement extends DesignElementBase {
  type: 'chart';
  chartType: ChartType;
  dataset: TableDataset;
  // chart configuration...
}
```

**Implementation notes:**
- Integrate Chart.js or ECharts
- Create the ChartElement component
- Implement a chart configuration panel
- Generate a `<chart>` tag in the JRXML

#### 3.2.2 Subreport
**Priority: 🟡 Medium-high**

```typescript
// Subreport element interface
interface SubreportElement extends DesignElementBase {
  type: 'subreport';
  subreportExpression: string;
  parametersMapExpression?: string;
  connectionExpression?: string;
  dataset?: TableDataset;
}
```

**Implementation notes:**
- Create the SubreportElement component
- Implement subreport parameter mapping
- Support connection/data source passthrough
- Generate a `<subreport>` tag in the JRXML

#### 3.2.3 Crosstab
**Priority: 🟡 Medium**

```typescript
// Crosstab element interface
interface CrosstabElement extends DesignElementBase {
  type: 'crosstab';
  dataset: TableDataset;
  rowGroups: CrosstabGroup[];
  columnGroups: CrosstabGroup[];
  measures: CrosstabMeasure[];
}
```

#### 3.2.4 Barcode
**Priority: 🟡 Medium**

```typescript
// Barcode type enum
enum BarcodeType {
  Code128 = 'code128',
  QRCode = 'qrCode',
  EAN13 = 'ean13',
  UPC = 'upc',
  // ... more types
}

// Barcode element interface
interface BarcodeElement extends DesignElementBase {
  type: 'barcode';
  barcodeType: BarcodeType;
  expression: string;
}
```

### 3.3 Phase 3: UI/UX Enhancements (2-3 months)

#### 3.3.1 Outline View
**Priority: 🟡 Medium**

```vue
<!-- Outline view component -->
<template>
  <div class="outline-view">
    <div class="outline-header">Outline</div>
    <div class="outline-tree">
      <div v-for="band in bands" :key="band.type">
        <div class="band-node">{{ band.type }}</div>
        <div v-for="element in band.elements" :key="element.uuid">
          <div class="element-node" @click="selectElement(element)">
            {{ getElementIcon(element.type) }} {{ getElementName(element) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Implementation notes:**
- Create the OutlineView component
- Implement the tree-structure display
- Support click-to-select for elements
- Support drag-to-reorder
- Keep in sync with the selection state

#### 3.3.2 Element Constraint Configuration
**Priority: 🟢 Medium-low**

```typescript
// Element constraints interface
interface ElementConstraints {
  // Stretch type
  stretchType?: 'RelativeToTallestObject' | 'RelativeToBandHeight' | 'NoStretchor';
  // Position type
  positionType?: 'FixRelativeToObject' | 'Float' | 'StretchRelativeToBottom';
  // Whether stretching is allowed
  isStretchWithOverflow?: boolean;
}
```

#### 3.3.3 Data Source Configuration
**Priority: 🟡 Medium**

```typescript
// Data source type
enum DataSourceType {
  JDBC = 'jdbc',
  XML = 'xml',
  CSV = 'csv',
  JavaBean = 'javabean',
  Empty = 'empty'
}

// Data source configuration
interface DataSourceConfig {
  type: DataSourceType;
  // JDBC configuration
  jdbcUrl?: string;
  username?: string;
  password?: string;
  driverClass?: string;
  // other configuration...
}
```

### 3.4 Phase 4: Advanced Features (3-4 months)

#### 3.4.1 Resource Bundles
**Priority: 🟢 Low**

```typescript
// Resource bundle configuration
interface ResourceBundle {
  name: string;
  locale: string;
  properties: Record<string, string>;
}

// Support resource bundle references in expressions
// $R{resource.key}
```

#### 3.4.2 Sparkline
**Priority: 🟢 Low**

```typescript
// Sparkline element interface
interface SparklineElement extends DesignElementBase {
  type: 'sparkline';
  sparklineType: 'line' | 'bar' | 'area';
  expression: string;
}
```

#### 3.4.3 Table of Contents
**Priority: 🟢 Low**

```typescript
// Table of contents element interface
interface TableOfContentsElement extends DesignElementBase {
  type: 'tableOfContents';
  bookmarkLevel: number;
  // table of contents style configuration...
}
```

---

## IV. Technical Implementation Recommendations

### 4.1 Architecture Optimization

```typescript
// Suggested modular architecture
src/
├── components/
│   ├── elements/
│   │   ├── base/           # base element components
│   │   ├── text/           # text-related elements
│   │   ├── shape/          # shape-related elements
│   │   ├── container/      # container-related elements
│   │   ├── chart/          # chart-related elements (new)
│   │   ├── barcode/        # barcode-related elements (new)
│   │   └── advanced/       # advanced elements (subreport, crosstab, etc.)
│   ├── panels/
│   │   ├── outline/        # outline view (new)
│   │   ├── expression/     # expression builder (new)
│   │   └── datasource/     # data source configuration (new)
│   └── editor/
│       └── expression/     # expression editor
├── utils/
│   ├── jrxml/
│   │   ├── generators/     # generators split by element type
│   │   ├── parsers/        # parsers split by element type
│   │   └── validators/     # JRXML validators
│   └── export/             # export functionality module (new)
│       ├── html.ts
│       ├── excel.ts
│       └── csv.ts
└── composables/
    ├── useGroups.ts        # group management (new)
    ├── useExpression.ts    # expression management (new)
    └── useExport.ts        # export management (new)
```

### 4.2 JRXML Generator Optimization

```typescript
// Suggested generator modularization
export class JRXMLGenerator {
  // Core generation
  static generate(properties: ReportProperties, bands: Band[], ...): string
  
  // Sub-generators
  static generateGroupXML(group: ReportGroup): string
  static generateChartXML(chart: ChartElement): string
  static generateSubreportXML(subreport: SubreportElement): string
  static generateBarcodeXML(barcode: BarcodeElement): string
  static generateCrosstabXML(crosstab: CrosstabElement): string
}
```

### 4.3 JRXML Parser Optimization

```typescript
// Suggested parser modularization
export class JRXMLParser {
  // Core parsing
  static parse(content: string): ReportData
  
  // Sub-parsers
  static parseGroupElement(elem: Element): ReportGroup
  static parseChartElement(elem: Element): ChartElement
  static parseSubreportElement(elem: Element): SubreportElement
  static parseBarcodeElement(elem: Element): BarcodeElement
  static parseCrosstabElement(elem: Element): CrosstabElement
}
```

---

## V. Implementation Roadmap

### Phase 1: Foundational Completion (1-2 months)
- [x] Group Management ✅ Complete
- [ ] Expression Builder
- [ ] Multi-format export (HTML, Excel, CSV)

### Phase 2: Advanced Elements (2-3 months)
- [ ] Chart support
- [ ] Subreport
- [ ] Barcode

### Phase 3: UI Enhancements (2-3 months)
- [ ] Outline View
- [ ] Element constraint configuration
- [ ] Data source configuration

### Phase 4: Advanced Features (3-4 months)
- [ ] Crosstab
- [ ] Resource Bundles
- [ ] Sparkline
- [ ] Table of Contents

---

## VI. Summary

### Current Project Strengths
1. ✅ Lightweight, no installation needed, runs directly in the browser
2. ✅ Modern UI, good user experience
3. ✅ Complete set of basic element types (9 types)
4. ✅ Supports Chinese/English internationalization
5. ✅ Open-source code, easy to extend

### Main Gaps
1. ❌ Lacks advanced elements such as charts, subreports, and crosstabs
2. ❌ Lacks an expression builder, requiring manual input
3. ❌ Lacks multi-format export support
4. ✅ Group management functionality is complete
5. ❌ Lacks auxiliary design tools such as an outline view

### Optimization Priority Recommendations
1. **P0 (immediate)**: ~~Group management~~ ✅ Complete, Expression Builder, multi-format export
2. **P1 (1-2 months)**: Chart support, Subreport, Barcode
3. **P2 (2-3 months)**: Outline View, data source configuration, element constraints
4. **P3 (3-4 months)**: Crosstab, Resource Bundles, Sparkline

Through these optimizations, JRXML Web Designer will gradually approach the feature level of the official Jaspersoft Studio 6, while retaining its advantages of being lightweight and easy to use — becoming an excellent web-based alternative for JasperReports design.
