#!/bin/bash

# JRXML attribute full validation test
# Uses the local JasperReports 6.21.5 + Maven dependencies

set -e

JASPERREPORT_JAR="/Users/yan.yang/open/jrxml_web_designer/lib/jasperreports-6.21.5.jar"
MAVEN_REPO="/Users/yan.yang/.m2/repository"
TEST_DIR="/Users/yan.yang/open/jrxml_web_designer/test-attribute-validation"
OUTPUT_DIR="$TEST_DIR/compiled"

# Full classpath
export CLASSPATH="/Users/yan.yang/open/jrxml_web_designer/tools:$JASPERREPORT_JAR:$MAVEN_REPO/commons-digester/commons-digester/2.1/commons-digester-2.1.jar:$MAVEN_REPO/commons-beanutils/commons-beanutils/1.11.0/commons-beanutils-1.11.0.jar:$MAVEN_REPO/commons-logging/commons-logging/1.3.5/commons-logging-1.3.5.jar:$MAVEN_REPO/org/apache/commons/commons-collections4/4.4/commons-collections4-4.4.jar:$MAVEN_REPO/commons-collections/commons-collections/3.2.2/commons-collections-3.2.2.jar"

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
TOTAL=0

# Test function
test_jrxml() {
    local name="$1"
    local expected_result="$2"  # "pass" or "fail"
    local jrxml_file="$TEST_DIR/$name.jrxml"
    local output_file="$OUTPUT_DIR/$name.output"

    TOTAL=$((TOTAL + 1))
    echo -e "\n${YELLOW}Test $TOTAL: $name${NC}"
    echo "─────────────────────────────────────────"

    # Run the compiler
    if java JRXMLCompiler "$jrxml_file" "$OUTPUT_DIR/$name.jasper" > "$output_file" 2>&1; then
        # Compilation succeeded
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✅ PASS: compilation succeeded (expected behavior)${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: compilation succeeded, but was expected to fail${NC}"
            FAILED=$((FAILED + 1))
        fi
    else
        # Compilation failed
        local error_msg=$(grep -E "not allowed|not allowed to appear|error" "$output_file" | head -1)
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ PASS: compilation failed (expected behavior)${NC}"
            echo -e "Error: $error_msg"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: compilation failed, but was expected to succeed${NC}"
            echo -e "Error: $error_msg"
            FAILED=$((FAILED + 1))
        fi
    fi
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}JRXML attribute full validation test${NC}"
echo -e "${GREEN}Using JasperReports 6.21.5 + Maven dependencies${NC}"
echo -e "${GREEN}========================================${NC}"

# ============================================================================
# Test 1: uuid attribute validation
# ============================================================================

echo -e "\n${YELLOW}========== 1. uuid attribute validation ==========${NC}"

test_jrxml "field_with_uuid" "fail"
test_jrxml "field_without_uuid" "pass"
test_jrxml "variable_with_uuid" "fail"
test_jrxml "variable_without_uuid" "pass"
test_jrxml "parameter_with_uuid" "pass"
test_jrxml "parameter_without_uuid" "pass"
test_jrxml "sortField_with_uuid" "fail"
test_jrxml "sortField_without_uuid" "pass"
test_jrxml "group_with_uuid" "fail"
test_jrxml "group_without_uuid" "pass"
test_jrxml "band_with_uuid" "fail"
test_jrxml "band_without_uuid" "pass"

# ============================================================================
# Test 2: positionType enum value validation
# ============================================================================

echo -e "\n${YELLOW}========== 2. positionType enum value validation ==========${NC}"

test_jrxml "positionType_FixRelativeToTop" "pass"
test_jrxml "positionType_FixRelativeToBottom" "pass"
test_jrxml "positionType_Float" "pass"
test_jrxml "positionType_FixRelativeToBand" "fail"

# ============================================================================
# Test summary
# ============================================================================

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Test complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Total: $TOTAL"

# Save results
cat > "$TEST_DIR/validation-summary.txt" << EOF
JRXML Attribute Validation Test Results
====================
Test time: $(date)
Total: $TOTAL, Passed: $PASSED, Failed: $FAILED

uuid attribute validation:
- field with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/field_with_uuid.output" 2>/dev/null || echo "not run")
- variable with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/variable_with_uuid.output" 2>/dev/null || echo "not run")
- parameter with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/parameter_with_uuid.output" 2>/dev/null || echo "not run")
- sortField with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/sortField_with_uuid.output" 2>/dev/null || echo "not run")
- group with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/group_with_uuid.output" 2>/dev/null || echo "not run")
- band with uuid: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/band_with_uuid.output" 2>/dev/null || echo "not run")

positionType enum value validation:
- FixRelativeToTop: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/positionType_FixRelativeToTop.output" 2>/dev/null || echo "not run")
- FixRelativeToBottom: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/positionType_FixRelativeToBottom.output" 2>/dev/null || echo "not run")
- Float: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/positionType_Float.output" 2>/dev/null || echo "not run")
- FixRelativeToBand: $(grep -o "✅ PASS\|❌ FAIL" "$OUTPUT_DIR/positionType_FixRelativeToBand.output" 2>/dev/null || echo "not run")
EOF

echo -e "\nDetailed results saved to: $TEST_DIR/validation-summary.txt"
