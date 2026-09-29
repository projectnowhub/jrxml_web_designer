# JRXML Generator Consistency Check Report

## Check date
2026-06-09

## Scope
The `generateJRXMLContent()` function in `src/utils/jrxmlGenerator.ts`

## Results

### Total issues found: 6

---

## Issue list

### 🔴 Issue 1: Child element order does not follow the XSD

**Severity**: HIGH  
**Impact**: The JRXML fails XSD validation  
**Location**: lines 75-265

**Current order**:
```
1. reportFont (line 75)
2. properties (lines 78-85)
3. styles (lines 87-96)
4. parameters (lines 98-110)
5. queryString (lines 112-115)
6. subDatasets (lines 117-166)
7. fields (lines 168-191)
8. variables (lines 193-221)
9. groups (lines 223-265)
```

**Correct order** (per the XSD):
```
1. properties ← should come first
2. propertyExpressions (not implemented yet)
3. imports (not implemented yet)
4. templates (not implemented yet)
5. reportFonts ← should come before styles
6. styles
7. subDatasets ← should come before parameters
8. scriptlets (not implemented yet)
9. parameters ← should come after subDatasets
10. queryString
11. fields
12. sortFields (not implemented yet)
13. variables
14. filterExpression (not implemented yet)
15. groups
```

---

### 🔴 Issue 2: Parameter is missing the UUID attribute

**Severity**: HIGH  
**Impact**: Fails strict JasperReports validation  
**Location**: line 103

**Current code**:
```typescript
jrxml += `  <parameter name="${param.name}" class="${param.class}">\n`;
```

**Fix**:
```typescript
jrxml += `  <parameter name="${param.name}" class="${param.class}" uuid="${generateUUID()}">\n`;
```

---

### 🔴 Issue 3: Field is missing the UUID attribute

**Severity**: HIGH  
**Impact**: Fails strict JasperReports validation  
**Location**: lines 179 and 187

**Current code**:
```typescript
// Line 179
jrxml += `  <field name="${field.name}" class="${field.class}">\n`;
// Line 187
jrxml += `  <field name="${field.name}" class="${field.class}"/>\n`;
```

**Fix**:
```typescript
// Line 179
jrxml += `  <field name="${field.name}" class="${field.class}" uuid="${generateUUID()}">\n`;
// Line 187
jrxml += `  <field name="${field.name}" class="${field.class}" uuid="${generateUUID()}"/>\n`;
```

---

### 🔴 Issue 4: Variable is missing the UUID attribute

**Severity**: HIGH  
**Impact**: Fails strict JasperReports validation  
**Location**: line 198

**Current code**:
```typescript
let attrs = `name="${variable.name}" class="${variable.class}"`;
```

**Fix**:
```typescript
let attrs = `name="${variable.name}" class="${variable.class}" uuid="${generateUUID()}"`;
```

---

### 🔴 Issue 5: Group is missing the UUID attribute

**Severity**: HIGH  
**Impact**: Fails strict JasperReports validation  
**Location**: line 228

**Current code**:
```typescript
let groupAttrs = `name="${group.name}"`;
```

**Fix**:
```typescript
let groupAttrs = `name="${group.name}" uuid="${generateUUID()}"`;
```

---

### 🔴 Issue 6: Band is missing the UUID attribute

**Severity**: HIGH  
**Impact**: Fails strict JasperReports validation  
**Location**: line 273

**Current code**:
```typescript
let bandAttributes = `height="${band.height}"`;
```

**Fix**:
```typescript
let bandAttributes = `height="${band.height}" uuid="${generateUUID()}"`;
```

---

### 🟡 Issue 7: SubDataset uses crypto.randomUUID() instead of generateUUID()

**Severity**: MEDIUM  
**Impact**: Inconsistent code; the fallback logic is not used  
**Location**: line 122

**Current code**:
```typescript
let subDatasetAttrs = `name="${dataset.name}" uuid="${dataset.uuid || crypto.randomUUID()}"`;
```

**Fix**:
```typescript
let subDatasetAttrs = `name="${dataset.name}" uuid="${dataset.uuid || generateUUID()}"`;
```

---

### 🟡 Issue 8: Fields inside a SubDataset are missing the UUID attribute

**Severity**: MEDIUM  
**Impact**: Fails strict JasperReports validation  
**Location**: line 150

**Current code**:
```typescript
jrxml += `    <field name="${field.name}" class="${field.class}">\n`;
```

**Fix**:
```typescript
jrxml += `    <field name="${field.name}" class="${field.class}" uuid="${generateUUID()}">\n`;
```

---

## Fix priority

### Priority 1 (must fix)
1. Child element order - issue 1
2. Add UUIDs - issues 2, 3, 4, 5, 6

### Priority 2 (recommended)
7. SubDataset UUID call - issue 7
8. UUIDs for fields inside a SubDataset - issue 8

---

## Fix plan

### Step 1: Restructure the child element order

Rewrite generateJRXMLContent() to follow the order defined by the XSD.

**Location**: lines 74-296

### Step 2: Add UUID attributes

Add UUID attributes to all main elements.

**Locations**:
- Line 103: Parameter
- Line 150: Field inside a SubDataset
- Line 179: Field (with properties)
- Line 187: Field (without properties)
- Line 198: Variable
- Line 228: Group
- Line 273: Band

### Step 3: Fix the SubDataset UUID call

**Location**: line 122

---

## Expected result after the fix

✅ Child element order follows the XSD
✅ All main elements have UUID attributes
✅ Passes XSD validation
✅ Passes strict JasperReports validation mode
✅ Consistent code style (generateUUID() used everywhere)

---

## Verification

After the fix, run these tests:

1. Element order test
2. UUID generation test
3. JSON Schema validation test
4. Generate JRXML and test it in JasperReports

---

*Report generated: 2026-06-09*
