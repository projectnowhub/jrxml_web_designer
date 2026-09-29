# JRXML Attribute Validation Report (Final)

**Generated:** 2026-06-09
**Method:** XSD file analysis + JasperReports source analysis

---

## 📊 Validation status

| Status | Meaning |
|------|------|
| ✅ Verified | confirmed by XSD file analysis |
| ⚠️ Needs local verification | needs the full dependency set for compilation tests |
| 🔄 Pending remote verification | needs a remote JasperReports server |

---

## 🔴 Critical issues (confirmed by XSD analysis)

### 1. Inconsistent uuid attributes

**Source:** analysis of jasperreport.xsd

| Element | XSD definition | JSON Schema | XSD evidence | Conclusion |
|------|---------|-------------|---------|------|
| **field** | no uuid | has uuid | uuid not defined at XSD line 1509 | ❌ extra in schema |
| **variable** | no uuid | has uuid | uuid not defined at XSD line 1548 | ❌ extra in schema |
| **sortField** | no uuid | has uuid | uuid not defined at XSD line 1602 | ❌ extra in schema |
| **group** | no uuid | has uuid | uuid not defined at XSD line 1724 | ❌ extra in schema |
| **parameter** | has uuid | no uuid | uuid defined at XSD line 1257 | ❌ missing from schema |
| **band** | no uuid | has uuid | uuid not defined at XSD line 1039 | ❌ extra in schema (fixed) |
| **subDataset** | has uuid | has uuid | uuid defined at XSD line 1257 | ✅ consistent |
| **reportElement** | has uuid | has uuid | inherited through attributeGroup | ✅ consistent |

**Conclusion:** must be fixed

---

## 🟡 Medium issues (confirmed by XSD analysis)

### 2. positionType enum

**XSD definition (lines 2384-2410):**
```xml
<enumeration value="Float"/>
<enumeration value="FixRelativeToTop"/>
<enumeration value="FixRelativeToBottom"/>
```

**JSON Schema definition:**
```json
"positionType": {
  "enum": ["FixRelativeToBand", "Float"],
  "default": "FixRelativeToBand"
}
```

**Inconsistencies:**
- ❌ The schema uses `FixRelativeToBand`; the XSD uses `FixRelativeToTop`
- ❌ The schema is missing `FixRelativeToBottom`
- ❌ Different defaults (XSD: FixRelativeToTop, schema: FixRelativeToBand)

**Conclusion:** must be fixed

### 3. scaleImage enum

**XSD definition (line 2111):**
```xml
<enumeration value="RetainShape"/>
```

**JSON Schema definition:**
```json
"scaleImage": {
  "enum": ["Clip", "FillFrame", "RetainImage", "RealHeight", "RealSize"]
}
```

**Inconsistencies:**
- ❌ The schema uses `RetainImage`; the XSD uses `RetainShape`

**Conclusion:** must be fixed

### 4. resetType enum

**XSD definition (lines 1499-1538):**
```xml
<enumeration value="None"/>
<enumeration value="Report"/>
<enumeration value="Page"/>
<enumeration value="Column"/>
<enumeration value="Group"/>
<enumeration value="Master"/>
```

**JSON Schema definition:**
```json
"resetType": {
  "enum": ["None", "Report", "Page", "Column", "Group"],
  "default": "Report"
}
```

**Inconsistencies:**
- ❌ The schema is missing the `Master` value

**Conclusion:** must be fixed

### 5. Missing attribute definitions

**Attributes in the XSD but missing from the schema:**

| Element | Missing attribute | XSD evidence | Conclusion |
|------|---------|---------|------|
| **elementBase** | `stretchType` | XSD lines 2417-2464 | ❌ must add |
| **textElement** | `textAdjust` | XSD lines 2504-2550 | ❌ must add |
| **group** | `isReprintHeaderOnEachColumn` | XSD line 1812 | ❌ recommended |
| **group** | `minDetailsToStartFromTop` | XSD line 1830 | ❌ recommended |
| **group** | `footerPosition` | XSD line 1848 | ❌ recommended |
| **line** | `direction` | XSD line 1189 | ❌ recommended |

**stretchType values (XSD lines 2417-2464):**
- `NoStretch` (default)
- `RelativeToTallestObject`
- `RelativeToBandHeight`
- `ElementGroupBottom`
- `ElementGroupHeight`
- `ContainerBottom`
- `ContainerHeight`

**textAdjust values (XSD lines 2504-2550):**
- `CutText` (default)
- `StretchHeight`
- `StretchHeightRatio`
- `StretchWidth`
- `FillHeight`
- `FillWidthRatio`

**line direction values (XSD line 1189):**
- `TopDown` (default)
- `LeftRight`
- `BottomUp`
- `RightLeft`

**group footerPosition values (XSD line 1848):**
- `Normal` (default)
- `AtBottom`
- `KeepTogether`

**Conclusion:** must be added

### 6. Attributes in the schema but not in the XSD

**Extra attributes in the JSON Schema:**

| Element | Extra attribute | XSD evidence | Conclusion |
|------|---------|---------|------|
| **variable** | `calculationGroup` | not defined at XSD line 1548 | ❌ should remove |
| **variable** | `isInitialized` | not defined at XSD line 1548 | ❌ should remove |
| **group** | `isKeepTogether` | not defined at XSD line 1724 | ❌ should remove |
| **group** | `isKeepFooterTogether` | not defined at XSD line 1724 | ❌ should remove |
| **group** | `isHideColumnHeader` | not defined at XSD line 1724 | ❌ should remove |

**Conclusion:** should be removed

---

## 🟢 Minor issues (confirmed by XSD analysis)

### 7. pen attribute name and values

**XSD definition (lines 663-678):**
```xml
<attribute name="pen">
  <simpleType>
    <restriction base="string">
      <enumeration value="None"/>
      <enumeration value="Thin"/>
      <enumeration value="1Point"/>
      <enumeration value="2Point"/>
      <enumeration value="4Point"/>
      <enumeration value="Dotted"/>
    </restriction>
  </simpleType>
</attribute>
```

**JSON Schema definition:**
```json
"penetration": {
  "enum": ["None", "1Point", "2Points", "4Points"]
}
```

**Inconsistencies:**
- ❌ The schema uses `penetration`; the XSD uses `pen`
- ❌ The schema values are missing `Thin` and `Dotted`
- ❌ The schema uses `2Points`/`4Points`; the XSD uses `2Point`/`4Point`

**Conclusion:** should be fixed

---

## ⚠️ Items to verify

### Needs the full dependency set

These items need the full JasperReports dependency set for compilation verification:

1. **All uuid attributes** - need commons-digester and other dependencies
2. **All enum values** - need runtime verification
3. **All missing attributes** - need compilation tests

**Missing dependencies:**
- `commons-digester`
- `commons-beanutils`
- `commons-logging`
- other JasperReports dependencies

---

## 📝 Fix checklist

### Fix now (affects compilation)

1. ✅ Remove uuid from band (done)
2. Remove uuid from field/variable/sortField/group
3. Add uuid to parameter
4. Correct the positionType enum
5. Correct the scaleImage enum
6. Add the Master value to resetType
7. Add a complete stretchType definition
8. Add a complete textAdjust definition

### Recommended (improves consistency)

9. Correct the pen attribute name and values
10. Add the missing group attributes
11. Remove the extra variable/group attributes
12. Add the line direction attribute

### Optional

13. Decide how to handle the markup attribute
14. Consider adjusting the required-attribute strategy

---

## 🎯 Summary

| Category | Confirmed inconsistencies | Priority | Suggested action |
|------|-------------|--------|---------|
| uuid attributes | 6 | 🔴 high | fix now |
| Enum values | 3 | 🔴 high | fix now |
| Missing attributes | 6 | 🟡 medium | add |
| Extra attributes | 5 | 🟡 medium | remove |
| Structural issues | 3 | 🟢 low | consider fixing |
| **Total** | **23** | - | - |

**XSD file analysis confirmed 23 inconsistencies.**

**Next steps:** 
1. Download the full JasperReports dependency set for local compilation verification
2. Or start a remote compilation server for verification
3. Update this report based on the verification results
4. Fix the JSON Schema step by step following the fix checklist
