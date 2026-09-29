# JRXML Bidirectional Conversion Consistency Analysis

## Overview

This analysis checks the consistency between JRXML parsing (JRXML → JSON) and generation (JSON → JRXML).

**Parser entry point**: `src/utils/jrxml/parse.ts` → `parseJRXMLContent()`
**Generator entry point**: `src/utils/jrxmlGenerator.ts` → `generateJRXMLContent()`

---

## 1. Current consistency status

### Consistency score: 70%

**Fully consistent parts**: 60%
**Inconsistent parts**: 40%

---

## 2. Key inconsistencies

### 🔴 Issue 1: Inconsistent UUIDs (critical)

**Generator**: ✅ generates UUIDs for all main elements
- Parameters: have uuid
- Fields: have uuid
- Variables: have uuid
- Groups: have uuid
- Bands: have uuid

**Parser**: ❌ does not extract UUIDs
- Parameters: uuid not extracted
- Fields: uuid not extracted
- Variables: uuid not extracted
- Groups: uuid not extracted
- Bands: uuid not extracted

**Impact**:
- JRXML → JSON loses UUID information
- JSON → JRXML generates new UUIDs
- Bidirectional conversion is not fully consistent

---

### 🟡 Issue 2: Inconsistent root element attributes (medium)

**Attributes parsed by the parser** (8):
- ✅ name
- ✅ pageWidth
- ✅ pageHeight
- ✅ leftMargin
- ✅ rightMargin
- ✅ topMargin
- ✅ bottomMargin
- ✅ whenNoDataType

**Attributes written by the generator** (7):
- ✅ name
- ✅ pageWidth
- ✅ pageHeight
- ✅ leftMargin
- ✅ rightMargin
- ✅ topMargin
- ✅ bottomMargin
- ❌ whenNoDataType (not generated)

**Unhandled attributes** (15+):
- ❌ language (default "java")
- ❌ columnCount (default 1)
- ❌ printOrder (default "Vertical")
- ❌ columnDirection (default "LTR")
- ❌ orientation (default "Portrait")
- ❌ sectionType (default "Band")
- ❌ columnWidth (default 555)
- ❌ columnSpacing (default 0)
- ❌ isTitleNewPage (default false)
- ❌ isSummaryNewPage (default false)
- ❌ isSummaryWithPageHeaderAndFooter (default false)
- ❌ isFloatColumnFooter (default false)
- ❌ isIgnorePagination (default false)

---

### 🟡 Issue 3: Inconsistent Field attributes (medium)

**Parsed by the parser**:
- ✅ name
- ✅ class

**Written by the generator**:
- ✅ name
- ✅ class
- ✅ uuid (newly added)
- ✅ properties (if present)

**Inconsistencies**:
- ⚠️ uuid is generated but not parsed
- ⚠️ properties are generated but not parsed

---

### 🟡 Issue 4: Inconsistent Parameter attributes (medium)

**Parsed by the parser**:
- ✅ name
- ✅ class
- ✅ defaultValue (from defaultValueExpression)

**Written by the generator**:
- ✅ name
- ✅ class
- ✅ uuid (newly added)
- ✅ defaultValue (as defaultValueExpression)

**Inconsistencies**:
- ⚠️ uuid is generated but not parsed

---

### 🟢 Issue 5: Inconsistent Variable attributes (low)

**Parsed by the parser** (7):
- ✅ name
- ✅ class
- ✅ calculationType
- ✅ resetType
- ✅ resetGroup
- ✅ expression
- ✅ initialValueExpression

**Written by the generator** (7 + uuid):
- ✅ name
- ✅ class
- ✅ uuid (newly added)
- ✅ calculationType
- ✅ resetType
- ✅ resetGroup
- ✅ expression
- ✅ initialValueExpression

**Inconsistencies**:
- ⚠️ uuid is generated but not parsed

---

### 🟢 Issue 6: Inconsistent Group attributes (low)

**Parsed by the parser** (8):
- ✅ name
- ✅ expression
- ✅ isStartNewPage
- ✅ isRepeatHeader
- ✅ isResetPageNumber
- ✅ header
- ✅ footer

**Written by the generator** (8 + uuid):
- ✅ name
- ✅ uuid (newly added)
- ✅ expression
- ✅ isStartNewPage
- ✅ isRepeatHeader
- ✅ isResetPageNumber
- ✅ header
- ✅ footer

**Inconsistencies**:
- ⚠️ uuid is generated but not parsed

---

## 3. Detailed comparison

| Attribute category | Parser | Generator | Consistent |
|---------|--------|--------|--------|
| **Root element** | | | |
| name | ✅ | ✅ | ✅ |
| pageWidth | ✅ | ✅ | ✅ |
| pageHeight | ✅ | ✅ | ✅ |
| leftMargin | ✅ | ✅ | ✅ |
| rightMargin | ✅ | ✅ | ✅ |
| topMargin | ✅ | ✅ | ✅ |
| bottomMargin | ✅ | ✅ | ✅ |
| whenNoDataType | ✅ | ❌ | ❌ |
| language | ❌ | ❌ | ✅ (neither handles it) |
| columnCount | ❌ | ❌ | ✅ (neither handles it) |
| printOrder | ❌ | ❌ | ✅ (neither handles it) |
| columnDirection | ❌ | ❌ | ✅ (neither handles it) |
| orientation | ❌ | ❌ | ✅ (neither handles it) |
| sectionType | ❌ | ❌ | ✅ (neither handles it) |
| columnWidth | ❌ | ❌ | ✅ (neither handles it) |
| columnSpacing | ❌ | ❌ | ✅ (neither handles it) |
| isTitleNewPage | ❌ | ❌ | ✅ (neither handles it) |
| isSummaryNewPage | ❌ | ❌ | ✅ (neither handles it) |
| isSummaryWithPageHeaderAndFooter | ❌ | ❌ | ✅ (neither handles it) |
| isFloatColumnFooter | ❌ | ❌ | ✅ (neither handles it) |
| isIgnorePagination | ❌ | ❌ | ✅ (neither handles it) |
| **Fields** | | | |
| name | ✅ | ✅ | ✅ |
| class | ✅ | ✅ | ✅ |
| uuid | ❌ | ✅ | ❌ |
| properties | ❌ | ✅ | ❌ |
| **Parameters** | | | |
| name | ✅ | ✅ | ✅ |
| class | ✅ | ✅ | ✅ |
| uuid | ❌ | ✅ | ❌ |
| defaultValue | ✅ | ✅ | ✅ |
| **Variables** | | | |
| name | ✅ | ✅ | ✅ |
| class | ✅ | ✅ | ✅ |
| uuid | ❌ | ✅ | ❌ |
| calculationType | ✅ | ✅ | ✅ |
| resetType | ✅ | ✅ | ✅ |
| resetGroup | ✅ | ✅ | ✅ |
| expression | ✅ | ✅ | ✅ |
| initialValueExpression | ✅ | ✅ | ✅ |
| **Groups** | | | |
| name | ✅ | ✅ | ✅ |
| uuid | ❌ | ✅ | ❌ |
| expression | ✅ | ✅ | ✅ |
| isStartNewPage | ✅ | ✅ | ✅ |
| isRepeatHeader | ✅ | ✅ | ✅ |
| isResetPageNumber | ✅ | ✅ | ✅ |
| header | ✅ | ✅ | ✅ |
| footer | ✅ | ✅ | ✅ |

---

## 4. Recommendations

### Priority 1: Fix inconsistent UUIDs (required)

**Parser change** (`src/utils/jrxml/parse.ts`):

```typescript
// Extract uuid when parsing Fields
const uuid = child.getAttribute("uuid");
if (uuid) field.uuid = uuid;

// Extract uuid when parsing Parameters
const uuid = child.getAttribute("uuid");
if (uuid) param.uuid = uuid;

// Extract uuid when parsing Variables
const uuid = child.getAttribute("uuid");
if (uuid) variable.uuid = uuid;

// Extract uuid when parsing Groups
const uuid = child.getAttribute("uuid");
if (uuid) group.uuid = uuid;
```

### Priority 2: Fix inconsistent root element attributes (recommended)

**Parser change** (`src/utils/jrxml/parse.ts`):

```typescript
const properties: ReportProperties = {
  // ... existing attributes
  language: jasperReportElem.getAttribute("language") || "java",
  columnCount: parseInt(jasperReportElem.getAttribute("columnCount") || "1"),
  printOrder: jasperReportElem.getAttribute("printOrder") || "Vertical",
  columnDirection: jasperReportElem.getAttribute("columnDirection") || "LTR",
  orientation: jasperReportElem.getAttribute("orientation") || "Portrait",
  sectionType: jasperReportElem.getAttribute("sectionType") || "Band",
  columnWidth: parseInt(jasperReportElem.getAttribute("columnWidth") || "555"),
  columnSpacing: parseInt(jasperReportElem.getAttribute("columnSpacing") || "0"),
  isTitleNewPage: jasperReportElem.getAttribute("isTitleNewPage") === "true",
  isSummaryNewPage: jasperReportElem.getAttribute("isSummaryNewPage") === "true",
  isSummaryWithPageHeaderAndFooter: jasperReportElem.getAttribute("isSummaryWithPageHeaderAndFooter") === "true",
  isFloatColumnFooter: jasperReportElem.getAttribute("isFloatColumnFooter") === "true",
  isIgnorePagination: jasperReportElem.getAttribute("isIgnorePagination") === "true",
};
```

**Generator change** (`src/utils/jrxmlGenerator.ts`):

```typescript
// Generate all attributes in buildJasperReportOpenTag
if (safeProperties.language && safeProperties.language \!== "java") {
  attrs += ` language="${safeProperties.language}"`;
}
if (safeProperties.whenNoDataType && safeProperties.whenNoDataType \!== "AllSectionsNoDetail") {
  attrs += ` whenNoDataType="${safeProperties.whenNoDataType}"`;
}
// ... and so on
```

### Priority 3: Fix inconsistent Field attributes (optional)

**Parser change** (`src/utils/jrxml/parse.ts`):

```typescript
// Extract properties when parsing Fields
const properties: Record<string, string> = {};
const propertyElems = child.querySelectorAll("property");
propertyElems.forEach((propElem) => {
  const propName = propElem.getAttribute("name");
  const propValue = propElem.getAttribute("value");
  if (propName && propValue) {
    properties[propName] = propValue;
  }
});
if (Object.keys(properties).length > 0) {
  field.properties = properties;
}
```

---

## 5. Verification plan

### 5.1 Round-trip test

```typescript
// Test UUID preservation
const jrxmlWithUUID = `
<jasperReport name="Test">
  <field name="f1" class="String" uuid="12345678-1234-1234-1234-123456789012"/>
</jasperReport>
`;

const json = parseJRXMLContent(jrxmlWithUUID);
console.log("Parsed UUID:", json.fields[0].uuid);

const regenerated = generateJRXMLContent(json.properties, [], json.fields);
console.log("Regenerated UUID:", regenerated.includes("12345678-1234-1234-1234-123456789012"));
```

### 5.2 Full round-trip test

```typescript
const originalJRXML = `<jasperReport name="Test" pageWidth="595" pageHeight="842" ...>...</jasperReport>`;

// Parse
const json = parseJRXMLContent(originalJRXML);

// Generate
const regeneratedJRXML = generateJRXMLContent(json.properties, json.bands, json.fields, json.parameters);

// Verify the core structure
console.log("Same number of fields:", json.fields.length === countFields(regeneratedJRXML));
console.log("Same number of parameters:", json.parameters.length === countParameters(regeneratedJRXML));
console.log("Same number of groups:", json.groups.length === countGroups(regeneratedJRXML));
```

---

## 6. Expected improvement

### Before
- Consistency score: 70%
- UUID: generated but not parsed
- Root element attributes: partly lost
- Field properties: lost

### After
- Consistency score: **95-100%**
- UUID: ✅ fully preserved
- Root element attributes: ✅ fully preserved
- Field properties: ✅ fully preserved

---

## 7. Related files

### Files to change
1. `src/utils/jrxml/parse.ts` - parser (add UUID and other attribute extraction)
2. `src/utils/jrxmlGenerator.ts` - generator (generate every parsed attribute)

### Reference files
1. `schemas/jrxml-schema.json` - JSON Schema specification
2. `jrxml-reference.md` - JRXML reference documentation
3. `CODE_COMPLIANCE_CHECK.md` - compliance analysis

---

*Analysis completed: 2026-06-09*
*Current status: 6 inconsistencies found that need fixing*
