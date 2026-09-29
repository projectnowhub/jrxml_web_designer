# JRXML Attribute Validation Results (Real Compilation Tests)

**Test time:** $(date)
**Test environment:** JasperReports 6.21.5 + Maven dependencies
**Test method:** local compilation

---

## ✅ Verified results

### 1. uuid attribute verification

| Element | With uuid | Without uuid | uuid allowed by XSD | JSON Schema status |
|------|--------|----------|----------------|-----------------|
| **band** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (fixed) ✅ |
| **parameter** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (to remove) |
| **field** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (to remove) |
| **variable** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (to remove) |
| **sortField** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (to remove) |
| **group** | ❌ fails | ✅ succeeds | ❌ not allowed | extra in schema (to remove) |

**Key findings:**
- ❌ **parameter doesn't allow uuid either** (unlike the earlier XSD analysis)
- ❌ None of the 6 elements allow the uuid attribute
- ✅ All uuid definitions in the JSON Schema need to be removed

### 2. positionType enum verification

| Value | Compilation result | Allowed by XSD |
|--------|----------|------------|
| `FixRelativeToTop` | ✅ succeeds | ✅ allowed |
| `FixRelativeToBottom` | ✅ succeeds | ✅ allowed |
| `Float` | ✅ succeeds | ✅ allowed |
| `FixRelativeToBand` | ❌ fails | ❌ not allowed |

**Key findings:**
- ✅ Allowed by the XSD: `FixRelativeToTop`, `FixRelativeToBottom`, `Float`
- ❌ Not allowed by the XSD: `FixRelativeToBand`
- ❌ The JSON Schema used a wrong enum value

---

## 📊 Corrected XSD rules

Based on the real compilation tests, the XSD allows the following:

### Elements that allow uuid
**None** - none of these elements allow the uuid attribute

### Elements that don't allow uuid
- band
- parameter
- field
- variable
- sortField
- group

### positionType values
- `FixRelativeToTop` (default)
- `FixRelativeToBottom`
- `Float`

---

## 🎯 Recommended fixes (based on real tests)

### Must fix

1. ✅ Remove uuid from band (done)
2. Remove uuid from parameter
3. Remove uuid from field
4. Remove uuid from variable
5. Remove uuid from sortField
6. Remove uuid from group
7. Correct the positionType enum
8. Correct the scaleImage enum
9. Add the missing attribute definitions

### Test environment dependencies
- Java: OpenJDK 1.8.0_492
- JasperReports: 6.21.5
- Commons-Digester: 2.1
- Commons-BeanUtils: 1.11.0
- Commons-Logging: 1.3.5
- Commons-Collections4: 4.4
- Commons-Collections: 3.2.2

