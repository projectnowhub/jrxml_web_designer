#!/bin/bash

# JRXML attribute validation compilation test
# Uses the local JasperReports library to validate whether each attribute is allowed

set -e

JASPERREPORT_JAR="/Users/yan.yang/open/jrxml_web_designer/lib/jasperreports-6.21.5.jar"
TEST_DIR="/Users/yan.yang/open/jrxml_web_designer/test-attribute-validation"
OUTPUT_DIR="$TEST_DIR/compiled"

# Create test directories
mkdir -p "$TEST_DIR" "$OUTPUT_DIR"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0

# Test function
test_jrxml() {
    local name="$1"
    local jrxml_content="$2"
    local expected_result="$3"  # "pass" or "fail"

    echo -e "\n${YELLOW}Test: $name${NC}"
    echo "─────────────────────────────────────────"

    # Save the JRXML file
    local jrxml_file="$TEST_DIR/$name.jrxml"
    echo "$jrxml_content" > "$jrxml_file"

    # Attempt compilation
    if java -cp "$JASPERREPORT_JAR" \
           net.sf.jasperreports.engine.design.JasperDesign \
           "$jrxml_file" \
           > "$OUTPUT_DIR/$name.jasper" 2>"$OUTPUT_DIR/$name.error"; then
        # Compilation succeeded
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✅ PASS: compilation succeeded (expected behavior)${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: compilation succeeded, but was expected to fail${NC}"
            echo "Error output:"
            cat "$OUTPUT_DIR/$name.error"
            FAILED=$((FAILED + 1))
        fi
    else
        # Compilation failed
        local error_msg=$(cat "$OUTPUT_DIR/$name.error")
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ PASS: compilation failed (expected behavior)${NC}"
            echo "Error message: $error_msg"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: compilation failed, but was expected to succeed${NC}"
            echo "Error message: $error_msg"
            FAILED=$((FAILED + 1))
        fi
    fi
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}JRXML attribute validation compilation test${NC}"
echo -e "${GREEN}Using JasperReports: $JASPERREPORT_JAR${NC}"
echo -e "${GREEN}========================================${NC}"

# ============================================================================
# Test 1: uuid attribute validation
# ============================================================================

echo -e "\n${YELLOW}========== 1. uuid attribute validation ==========${NC}"

# Test 1.1: field with uuid (expected to fail)
test_jrxml "field_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <field name="testField" class="java.lang.String" uuid="field-uuid-123"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$F{testField}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "fail"

# Test 1.2: field without uuid (expected to pass)
test_jrxml "field_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <field name="testField" class="java.lang.String"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$F{testField}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.3: variable with uuid (expected to fail)
test_jrxml "variable_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <variable name="testVar" class="java.lang.String" uuid="var-uuid-123"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "fail"

# Test 1.4: variable without uuid (expected to pass)
test_jrxml "variable_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <variable name="testVar" class="java.lang.String"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.5: parameter with uuid (expected to pass)
test_jrxml "parameter_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <parameter name="testParam" class="java.lang.String" uuid="param-uuid-123"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$P{testParam}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.6: parameter without uuid (expected to pass)
test_jrxml "parameter_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <parameter name="testParam" class="java.lang.String"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[$P{testParam}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.7: sortField with uuid (expected to fail)
test_jrxml "sortField_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <sortField name="testSort" uuid="sort-uuid-123"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "fail"

# Test 1.8: sortField without uuid (expected to pass)
test_jrxml "sortField_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <sortField name="testSort"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.9: group with uuid (expected to fail)
test_jrxml "group_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <group name="testGroup" uuid="group-uuid-123"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "fail"

# Test 1.10: group without uuid (expected to pass)
test_jrxml "group_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <group name="testGroup"/>
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 1.11: band with uuid (expected to fail)
test_jrxml "band_with_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30" uuid="band-uuid-123">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "fail"

# Test 1.12: band without uuid (expected to pass)
test_jrxml "band_without_uuid" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "pass"

# ============================================================================
# Test 2: positionType enum value validation
# ============================================================================

echo -e "\n${YELLOW}========== 2. positionType enum value validation ==========${NC}"

# Test 2.1: positionType=FixRelativeToTop (expected to pass)
test_jrxml "positionType_FixRelativeToTop" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid" positionType="FixRelativeToTop"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 2.2: positionType=FixRelativeToBottom (expected to pass)
test_jrxml "positionType_FixRelativeToBottom" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid" positionType="FixRelativeToBottom"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 2.3: positionType=Float (expected to pass)
test_jrxml "positionType_Float" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid" positionType="Float"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "pass"

# Test 2.4: positionType=FixRelativeToBand (expected to fail)
test_jrxml "positionType_FixRelativeToBand" '<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" uuid="test-uuid" positionType="FixRelativeToBand"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>' "fail"

# ============================================================================
# Test summary
# ============================================================================

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Test complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
