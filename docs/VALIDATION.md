# JRXML Validation

> How generated JRXML is checked, and what the checks found about the JSON Schema (`schemas/jrxml-schema.json`, used by the AI assistant) compared with the JasperReports 6.21.5 XSD. There are no unit tests in this repo (see `CLAUDE.md`).

## 1. How to check JRXML

### In the app

- **JRXML Content → Validate XSD**: checks the report against `jasperreport.xsd` (`src/utils/jrxml/xsdValidator.ts`). **Auto Fix** removes attributes the XSD doesn't allow.
- **Preview PDF**: the report server compiles and fills the report. This is the final check.

### Validation tools

| Tool | What it does |
|------|--------------|
| `tools/verify-jrxml.sh`, `tools/compile-test.sh` | Compile a JRXML file with the official JasperReports library |
| `tools/JRXMLCompiler.java` | The compiler those scripts call |
| `tools/run-attribute-validation.sh`, `run-full-validation.sh`, `run-validation-corrected.sh`, `test-attribute-validation.sh` | Compile each sample in `test-attribute-validation/` to see which attributes JasperReports accepts. They write `test-attribute-validation/VALIDATION_RESULTS.md`. The scripts have a hard-coded `TEST_DIR`; change it to this folder before running |
| `validator/` | Java (Maven) XSD validator, `JRXMLValidator.java` |
| `tests/jrxml-compatibility-test.ts` | Compilation compatibility checks |
| `tests/test_autofix.spec.ts` | Node script: runs Auto Fix on `tests/test_autofix_invalid_attrs.jrxml` and writes `tests/test_autofix_fixed.jrxml` |
| `tests/preview-server-test.html` | Open in a browser: sends sample reports to the preview server |

Compiling needs Java and the JasperReports 6.21.5 jars with their dependencies (commons-digester, commons-beanutils, commons-logging, commons-collections), for example from `~/.m2`.

## 2. Findings: JSON Schema vs XSD

Found by reading the XSD and the JasperReports source (2026-06-09). Where a real compilation was run (`test-attribute-validation/VALIDATION_RESULTS.md`), its result wins.

### 2.1 `uuid` attribute

| Element | Accepted by JasperReports | Schema has it | Action |
|---------|---------------------------|---------------|--------|
| `band` | No (compile fails) | Removed | Done |
| `parameter` | No (compile fails; the XSD reading said yes) | No | Keep it out |
| `field` | No (compile fails) | Yes | Remove |
| `variable` | No (compile fails) | Yes | Remove |
| `sortField` | No (compile fails) | Yes | Remove |
| `group` | No (compile fails) | Yes | Remove |
| `subDataset`, `reportElement` | Yes | Yes | OK |

### 2.2 Wrong or missing enum values

| Attribute | Correct values (XSD) | Schema problem |
|-----------|----------------------|----------------|
| `positionType` | `FixRelativeToTop` (default), `FixRelativeToBottom`, `Float` (all confirmed by compiling) | Uses `FixRelativeToBand`, which fails to compile; lacks `FixRelativeToBottom` |
| `scaleImage` | `Clip`, `FillFrame`, `RetainShape`, `RealHeight`, `RealSize` | `RetainImage` instead of `RetainShape` |
| `resetType` | `None`, `Report`, `Page`, `Column`, `Group`, `Master` | Lacks `Master` |
| `pen` (old graphic attribute) | `None`, `Thin`, `1Point`, `2Point`, `4Point`, `Dotted` | Named `penetration`; `2Points`/`4Points`; lacks `Thin`, `Dotted` |

### 2.3 Attributes the schema lacks

| Element | Attribute | Values |
|---------|-----------|--------|
| all elements | `stretchType` | `NoStretch` (default), `RelativeToTallestObject`, `RelativeToBandHeight`, `ElementGroupBottom`, `ElementGroupHeight`, `ContainerBottom`, `ContainerHeight` |
| text elements | `textAdjust` | `CutText` (default), `StretchHeight`, `StretchHeightRatio`, `StretchWidth`, `FillHeight`, `FillWidthRatio` |
| `group` | `isReprintHeaderOnEachColumn`, `minDetailsToStartFromTop`, `footerPosition` | `footerPosition`: `Normal`, `AtBottom`, `KeepTogether` |
| `line` | `direction` | `TopDown` (default), `LeftRight`, `BottomUp`, `RightLeft` |

### 2.4 Attributes the schema has but the XSD doesn't

- `variable`: `calculationGroup`, `isInitialized`
- `group`: `isKeepTogether`, `isKeepFooterTogether`, `isHideColumnHeader`

### 2.5 Smaller differences

- `markup`: the XSD has an enum (`none`, `html`, `rtf`, `xml`, `csv`); the schema has a boolean `isStyledWithMarkup`. Still to decide.
- The schema requires more than the XSD on `textField`, `parameter`, `field` and `style` (e.g. `class`). That's stricter but harmless; keep it.

## 3. Fix list for the schema

1. Remove `uuid` from `field`, `variable`, `sortField`, `group` (`band` is done; `parameter` must not get one)
2. Fix `positionType` and `scaleImage`; add `Master` to `resetType`
3. Add `stretchType` and `textAdjust`
4. Fix the `pen` name and values; add the missing `group` and `line` attributes
5. Remove the extra `variable` and `group` attributes
6. Decide on `markup`
