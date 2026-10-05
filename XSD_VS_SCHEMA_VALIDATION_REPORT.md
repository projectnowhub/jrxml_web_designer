# XSD vs JSON Schema Validation Report

**Generated:** 2026-06-09
**Method:** analysis of jasperreport.xsd + integration test verification (to be added once the remote server is back)

---

## 📊 Status legend

| Status | Meaning |
|------|------|
| ✅ Verified | confirmed by XSD file analysis |
| ⚠️ To verify | needs verification on the remote server |
| ❌ Confirmed inconsistency | the XSD and the JSON Schema clearly differ |

---

## 🔴 Critical issues (confirmed)

### 1. Inconsistent uuid attributes

| Element | XSD definition | JSON Schema | Status | Action |
|------|---------|-------------|------|---------|
| **field** | no uuid | has uuid | ❌ extra in schema | **remove** |
| **variable** | no uuid | has uuid | ❌ extra in schema | **remove** |
| **sortField** | no uuid | has uuid | ❌ extra in schema | **remove** |
| **group** | no uuid | has uuid | ❌ extra in schema | **remove** |
| **parameter** | has uuid | no uuid | ❌ missing from schema | **add** |
| **band** | no uuid | has uuid | ❌ extra in schema | **fixed** ✅ |

**Evidence:** jasperreport.xsd line 1257 (subDataset has uuid); real test cases have no uuid on band/field/variable/sortField/group

### 2. Wrong enum names

| Attribute | XSD value | JSON Schema value | Status | Action |
|------|-------|---------------|------|---------|
| **positionType** | `FixRelativeToTop` | `FixRelativeToBand` | ❌ wrong name | **change to FixRelativeToTop** |
| **positionType** | `FixRelativeToBottom` | not defined | ❌ missing | **add FixRelativeToBottom** |
| **scaleImage** | `RetainShape` | `RetainImage` | ❌ wrong name | **change to RetainShape** |

### 3. Missing enum values

| Attribute | Missing value | Status | Action |
|------|--------|------|---------|
| **resetType** | `Master` | ❌ missing | **add Master** |

---

## 🟡 Medium issues (confirmed)

### 4. Missing attribute definitions

| Attribute | Applies to | In XSD | In schema | Status | Action |
|------|---------|-------|----------|------|---------|
| **stretchType** | elementBase | ✅ | ❌ | ❌ missing | **add a full definition** |
| **textAdjust** | textElement | ✅ | ❌ | ❌ missing | **add a full definition** |

**stretchType values (to add):**
- `NoStretch` (default)
- `RelativeToTallestObject`
- `RelativeToBandHeight`
- `ElementGroupBottom`
- `ElementGroupHeight`
- `ContainerBottom`
- `ContainerHeight`

**textAdjust values (to add):**
- `CutText` (default)
- `StretchHeight`
- `StretchHeightRatio`
- `StretchWidth`
- `FillHeight`
- `FillWidthRatio`

### 5. Attributes in the XSD but missing from the schema

| Element | Missing attribute | Status | Action |
|------|---------|------|---------|
| **group** | `isReprintHeaderOnEachColumn` | ❌ missing | **add** |
| **group** | `minDetailsToStartFromTop` | ❌ missing | **add** |
| **group** | `footerPosition` | ❌ missing | **add** (enum: Normal, AtBottom, KeepTogether) |
| **line** | `direction` | ❌ missing | **add** (enum: TopDown, LeftRight, BottomUp, RightLeft) |

### 6. Attributes in the schema but not in the XSD (to remove)

| Element | Extra attribute | Status | Action |
|------|---------|------|---------|
| **variable** | `calculationGroup` | ❌ extra | **remove** |
| **variable** | `isInitialized` | ❌ extra | **remove** |
| **group** | `isKeepTogether` | ❌ extra | **remove** |
| **group** | `isKeepFooterTogether` | ❌ extra | **remove** |
| **group** | `isHideColumnHeader` | ❌ extra | **remove** |

---

## 🟢 Minor issues (confirmed)

### 7. Inconsistent attribute names/structure

| Issue | XSD | JSON Schema | Status | Action |
|------|-----|-------------|------|---------|
| pen attribute name | `pen` | `penetration` | ❌ wrong name | **change to pen** |
| pen values | `[None, Thin, 1Point, 2Point, 4Point, Dotted]` | `[None, 1Point, 2Points, 4Points]` | ❌ incomplete enum | **use the XSD values** |
| markup attribute | enum `[none, html, rtf, xml, csv]` | boolean `isStyledWithMarkup` | ⚠️ different structure | **to verify** |

### 8. Differences in required attributes

| Element | Schema requires | XSD requires | Status | Recommendation |
|------|-----------|---------|------|------|
| **staticText** | reportElement, text | nothing | ⚠️ stricter | keep as is |
| **textField** | reportElement, textFieldExpression | nothing | ⚠️ stricter | keep as is |
| **parameter** | name, class | name | ⚠️ stricter | keep as is |
| **field** | name, class | name | ⚠️ stricter | keep as is |
| **style** | name | nothing | ⚠️ stricter | keep as is |

---

## ⚠️ Pending remote server verification

The status of these items will be updated after verification on the remote JasperReports server:

### Attributes to verify

1. **Whether uuid is really disallowed on field/variable/sortField/group**
   - Test case created: `tests/unit/attribute-validation-remote.test.ts`
   - Remote server: `https://preview.report.projectnowcdp.com`
   - Status: 🔄 to verify once the server is back

2. **Whether parameter really supports uuid**
   - To verify

3. **The positionType values actually allowed**
   - To verify: FixRelativeToTop vs FixRelativeToBand vs FixRelativeToBottom vs Float

4. **The scaleImage values actually allowed**
   - To verify: RetainShape vs RetainImage

5. **Whether resetType supports Master**
   - To verify

6. **Whether stretchType and textAdjust are supported**
   - To verify

---

## 📝 Verification test cases

A complete remote verification test suite has been created:
- **File:** `tests/unit/attribute-validation-remote.test.ts`
- **Coverage:** every questionable attribute
- **Method:** real JasperReports compilation
- **Status:** 🔄 to run once the remote server is back

---

## 🎯 Recommended fix priority

### Fix now (affects compilation)
1. ✅ Remove uuid from band (done)
2. Remove uuid from field/variable/sortField/group
3. Add uuid to parameter
4. Correct the positionType enum
5. Correct the scaleImage enum
6. Add the Master value to resetType
7. Add the stretchType attribute
8. Add the textAdjust attribute

### Recommended (improves consistency)
9. Correct the pen attribute name and values
10. Add the missing group attributes
11. Remove the extra variable/group attributes

### Optional (improves completeness)
12. Decide how to handle the markup attribute
13. Consider adjusting the required-attribute strategy

---

## 📈 Summary

| Category | Confirmed inconsistencies | Pending remote verification | Action |
|------|-------------|-----------|---------|
| uuid attributes | 6 | 6 | remove 5 extra, add 1 missing |
| Enum values | 3 | 4 | fix names, add missing values |
| Missing attributes | 6 | 6 | add full definitions |
| Extra attributes | 5 | 5 | remove attributes that don't exist |
| Structural issues | 3 | 3 | fix attribute names and types |

**Total:** 23 confirmed inconsistencies, 24 items pending remote server verification

---

**Next step:** once the remote server is back, verify all attributes against it (Preview PDF, or the attribute-validation scripts in `tools/` with the samples in `test-attribute-validation/`) and update the report status.
