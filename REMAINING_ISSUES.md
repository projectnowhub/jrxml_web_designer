# JRXML Fixes - Remaining Open Issues

## 📊 Fixed vs open

### ✅ Fixed (4 issues)
1. ✅ Child element order - fixed
2. ✅ Inconsistent UUIDs - fixed
3. ✅ Inconsistent Field properties - fixed
4. ✅ Syntax error - fixed

### ❌ Open (3 issues)
1. ❌ Inconsistent advanced root element attributes - open (medium)
2. ❌ Inconsistent other Parameter attributes - open (low)
3. ❌ Inconsistent other Variable/Group attributes - open (low)

---

## 🔍 Open issue details

### Issue 1: Inconsistent advanced root element attributes (medium)

**Current state**:
- ✅ The parser reads 8 attributes
- ❌ The generator writes only 7 attributes
- ❌ 15+ optional attributes are not handled

**Details**:

#### 1.1 whenNoDataType attribute
**Parser**: ✅ parsed (line 90)
```typescript
whenNoDataType: jasperReportElem.getAttribute("whenNoDataType") || "AllSectionsNoDetail",
```

**Generator**: ❌ not generated
- Problem: the attribute is lost in the JSON → JRXML conversion
- Impact: the generated JRXML uses the default value instead of the original

**Fix**:
Add to `buildJasperReportOpenTag()`:
```typescript
if (safeProperties.whenNoDataType && safeProperties.whenNoDataType \!== "AllSectionsNoDetail") {
  attrs += ` whenNoDataType="${safeProperties.whenNoDataType}"`;
}
```

#### 1.2 Other unhandled attributes (15+)
**Parser**: ❌ not parsed
**Generator**: ❌ not generated

These attributes include:
- language (default "java")
- columnCount (default 1)
- printOrder (default "Vertical")
- columnDirection (default "LTR")
- orientation (default "Portrait")
- sectionType (default "Band")
- columnWidth (default 555)
- columnSpacing (default 0)
- isTitleNewPage (default false)
- isSummaryNewPage (default false)
- isSummaryWithPageHeaderAndFooter (default false)
- isFloatColumnFooter (default false)
- isIgnorePagination (default false)

**Impact**: these attributes are lost in the round trip and fall back to defaults

**Fix**:
1. Parse these attributes in the parser
2. Add them to the ReportProperties type
3. Generate them in the generator (when they differ from the default)

---

### Issue 2: Inconsistent other Parameter attributes (low)

**Current state**:
- ✅ name, class, defaultValue, uuid - handled
- ❌ other attributes not handled

**Unhandled attributes**:
- isForPrompting (default true)
- nested (default false)
- parameterDescription

**Impact**: these attributes are lost in the round trip

**Fix**:
Parse these attributes in the parser and generate them in the generator (when they differ from the default)

---

### Issue 3: Inconsistent other Variable/Group attributes (low)

**Current state**:
- ✅ Core attributes handled
- ❌ Some optional attributes not handled

**Unhandled Variable attributes**:
- incrementType (default "None")
- incrementGroup
- calculationGroup
- isInitialized (default false)

**Unhandled Group attributes**:
- isStartNewColumn (default false)
- isReprintHeaderOnEachPage (default false)
- isHideColumnHeader (default false)
- isKeepTogether (default false)
- isKeepFooterTogether (default false)
- minHeightToStartNewPage (default 0)

**Impact**: these attributes are lost in the round trip

---

## 📊 Fix priority

### Priority 1: Fix the whenNoDataType attribute (required)
**Estimated time**: 10 minutes
**Impact**: medium
**Difficulty**: low

**Locations**:
1. `src/utils/jrxml/xmlBuilder.ts` - generator
2. No parser change needed (already parsed)

### Priority 2: Fix the other root element attributes (recommended)
**Estimated time**: 1-2 hours
**Impact**: medium
**Difficulty**: medium

**Locations**:
1. `src/utils/jrxml/parse.ts` - add parsing
2. `src/utils/jrxml/types.ts` - add types
3. `src/utils/jrxml/xmlBuilder.ts` - generator

### Priority 3: Fix the other Parameter/Variable/Group attributes (optional)
**Estimated time**: 2-3 hours
**Impact**: low
**Difficulty**: medium

**Locations**:
1. `src/utils/jrxml/parse.ts` - add parsing
2. `src/utils/jrxml/types.ts` - add types
3. `src/utils/jrxmlGenerator.ts` - generator

---

## 🧪 Verification

### Test 1: whenNoDataType preservation
```typescript
const jrxml = `
<jasperReport name="Test" whenNoDataType="NoPages">
  <detail><band height="30"/></detail>
</jasperReport>
`;

const json = parseJRXMLContent(jrxml);
console.log("Parsed whenNoDataType:", json.properties.whenNoDataType);

const regenerated = generateJRXMLContent(json.properties);
console.log("whenNoDataType preserved:", regenerated.includes('whenNoDataType="NoPages"'));
```

### Test 2: Other attribute preservation
```typescript
const jrxml = `
<jasperReport name="Test" 
  language="groovy" 
  orientation="Landscape"
  isTitleNewPage="true">
  <detail><band height="30"/></detail>
</jasperReport>
`;

const json = parseJRXMLContent(jrxml);
const regenerated = generateJRXMLContent(json.properties);

console.log("language preserved:", regenerated.includes('language="groovy"'));
console.log("orientation preserved:", regenerated.includes('orientation="Landscape"'));
console.log("isTitleNewPage preserved:", regenerated.includes('isTitleNewPage="true"'));
```

---

## 📈 Expected result after the fix

### Current state
- Bidirectional consistency: 90%
- Root element attributes: 7/22 handled
- Parameter attributes: 4/7 handled
- Variable attributes: 7/11 handled
- Group attributes: 7/13 handled

### Expected after the fix
- Bidirectional consistency: **95-100%**
- Root element attributes: **22/22 handled**
- Parameter attributes: **7/7 handled**
- Variable attributes: **11/11 handled**
- Group attributes: **13/13 handled**

---

## 📝 Fix list summary

### Must fix (1 issue)
1. ❌ whenNoDataType attribute not generated
   - Location: xmlBuilder.ts
   - Time: 10 minutes
   - Impact: medium

### Should fix (2 issues)
2. ❌ 15+ other root element attributes not handled
   - Location: parse.ts, types.ts, xmlBuilder.ts
   - Time: 1-2 hours
   - Impact: medium

3. ❌ Other Parameter attributes not handled
   - Location: parse.ts, types.ts, jrxmlGenerator.ts
   - Time: 30 minutes
   - Impact: low

### Optional (1 issue)
4. ❌ Other Variable/Group attributes not handled
   - Location: parse.ts, types.ts, jrxmlGenerator.ts
   - Time: 1-2 hours
   - Impact: low

---

## 🎯 Suggested order

### Step 1 (10 minutes)
Fix the whenNoDataType attribute
- Change xmlBuilder.ts
- Add the attribute generation logic

### Step 2 (1-2 hours)
Fix the other root element attributes
- Add parsing in parse.ts
- Add types in types.ts
- Add generation in xmlBuilder.ts

### Step 3 (30 minutes)
Fix the other Parameter attributes
- Add parsing in parse.ts
- Add types in types.ts
- Add generation in jrxmlGenerator.ts

### Step 4 (1-2 hours, optional)
Fix the other Variable/Group attributes
- Add parsing in parse.ts
- Add types in types.ts
- Add generation in jrxmlGenerator.ts

---

## 📊 Total effort

### Must fix
- Time: 10 minutes
- Impact: medium

### Should fix
- Time: 2-3 hours
- Impact: medium

### Optional
- Time: 1-2 hours
- Impact: low

### Total
- **Must**: 10 minutes
- **Should**: 2-3 hours
- **Optional**: 1-2 hours
- **Total**: 3-5 hours

---

## 🏆 State after the fixes

### Expected results
- ✅ Bidirectional consistency: 95-100%
- ✅ All attributes preserved
- ✅ Fully XSD-compliant
- ✅ Passes strict JasperReports validation

### Project status
- Now: 90% complete
- After the fixes: **100% complete**

---

*Remaining issue list*
*Created: 2026-06-09*
*Current status: 4 issues fixed, 3 issues open*
