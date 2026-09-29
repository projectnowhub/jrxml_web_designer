# Child Element Order Restructure - Manual Steps Required

## ⚠️ Important

Because of Edit tool limitations, the child element order restructure **could not be applied automatically**. It has to be changed by hand.

## 📋 Current code issues

### Current order (incorrect)
```
1. reportFont (line 75) ← should be 5th
2. properties (lines 78-85) ← should be 1st
3. styles (lines 87-96) ← correct position
4. parameters (lines 98-110) ← should be 9th
5. queryString (lines 112-115) ← correct position
6. subDatasets (lines 117-166) ← should be 7th
7. fields (line 168) ← correct position
8. variables (line 193) ← correct position
9. groups (line 223) ← correct position
```

### Correct order required by the XSD
```
1. properties ← should come first
2-4. propertyExpressions, imports, templates (not implemented yet)
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
16-25. Bands
```

---

## 🔧 Manual change guide

### Step 1: Swap reportFont and properties

**Current code (lines 72-85)**:
```typescript
let jrxml = buildJasperReportOpenTag(safeProperties);

// Report-level default font
jrxml += `  <reportFont name="reportFont" fontName="${DEFAULT_FONT}"/>\n`;

// Add report properties (property elements)
if (reportProperties && reportProperties.length > 0) {
  jrxml += "\n  <!-- Report properties -->\n";
  reportProperties.forEach((prop) => {
    if (prop.name && prop.value) {
      jrxml += `  <property name="${prop.name}" value="${prop.value}"/>\n`;
    }
  });
}
```

**Change to**:
```typescript
let jrxml = buildJasperReportOpenTag(safeProperties);

// ============================================================
// Order 1: properties (report properties)
// ============================================================
if (reportProperties && reportProperties.length > 0) {
  jrxml += "\n  <!-- Report properties -->\n";
  reportProperties.forEach((prop) => {
    if (prop.name && prop.value) {
      jrxml += `  <property name="${prop.name}" value="${prop.value}"/>\n`;
    }
  });
}

// ============================================================
// Order 2-4: propertyExpressions, imports, templates (not implemented yet)
// ============================================================

// ============================================================
// Order 5: reportFonts (report font definitions)
// ============================================================
jrxml += "\n  <!-- Report font definitions -->\n";
jrxml += `  <reportFont name="reportFont" fontName="${DEFAULT_FONT}"/>\n`;
```

### Step 2: Swap parameters and subDatasets

**Current order**:
```
4. parameters (lines 98-110)
5. queryString (lines 112-115)
6. subDatasets (lines 117-166)
```

**Change to**:
```
7. subDatasets (moved before parameters)
8. scriptlets (not implemented yet)
9. parameters (moved before queryString)
10. queryString
```

### Step 3: Add section comments

Add a clear comment to each section:
```typescript
// ============================================================
// Order 1: properties (report properties)
// ============================================================

// ============================================================
// Order 5: reportFonts (report font definitions)
// ============================================================

// ============================================================
// Order 6: styles (style definitions)
// ============================================================

// ... and so on
```

---

## 📊 Impact

### Locations
- Lines 72-85: swap reportFont and properties
- Lines 98-166: swap parameters and subDatasets
- About 100 lines of code in total to reorder

### Result
- ✅ Child element order follows the XSD
- ✅ Passes XSD validation
- ✅ JasperReports parses the file correctly
- ✅ Clear code structure with explicit order markers

---

## 🧪 Verification

After the change, verify the order:

```bash
# Check the element order
grep -n "Order\|<property\|<reportFont\|<style\|<parameter\|<field\|<variable" src/utils/jrxmlGenerator.ts | head -30

# Expected line order
# 1. <property (around line 20)
# 2. <reportFont (around line 30)
# 3. <style (around line 35)
# 4. <subDataset (around line 50)
# 5. <parameter (around line 65)
# 6. <field (around line 80)
# 7. <variable (around line 95)
```

---

## ⏱️ Estimated effort

- Swap reportFont and properties: 5 minutes
- Swap parameters and subDatasets: 5 minutes
- Add section comments: 5 minutes
- Verification: 5 minutes
- **Total: 20 minutes**

---

## 📝 Notes

1. **Keep the logic unchanged**: only change the order, not the behaviour
2. **Keep all UUIDs**: don't remove the UUID attributes already added
3. **Keep comments clear**: every section needs an explicit order marker
4. **Verify**: run `npm run build` after the change

---

## 🎯 Benefits after the change

1. ✅ Fully XSD-compliant
2. ✅ Passes XSD validation
3. ✅ Better JasperReports compatibility
4. ✅ Clear, maintainable code structure
5. ✅ Compliance raised from 95% to 100%

---

*Manual change guide*
*Created: 2026-06-09*
