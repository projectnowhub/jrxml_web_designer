#!/bin/bash

# JRXML compilation validation script (using the official JasperReports library)
# Automatically downloads the JasperReports library and validates that the JRXML compiles successfully

set -e

# Configuration
JASPERREPORTS_VERSION="6.20.0"
JASPERREPORTS_JAR="jasperreports-${JASPERREPORTS_VERSION}.jar"
JASPERREPORTS_URL="https://sourceforge.net/projects/jasperreports/files/jasperreports/${JASPERREPORTS_VERSION}/${JASPERREPORTS_JAR}/download"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../lib"
TEST_DIR="${SCRIPT_DIR}/../test-reports"
OUTPUT_DIR="${SCRIPT_DIR}/../test-compiled"

# Create directories
mkdir -p "$LIB_DIR"
mkdir -p "$TEST_DIR"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}JRXML compilation validation tool (using the official JasperReports library)${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Check whether Java is installed
echo -e "${YELLOW}Step 1: Checking the Java environment${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}✗ Java is not installed${NC}"
    echo "Please install Java JDK 8+ first"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d '"' -f 2)
echo -e "${GREEN}✓ Java is installed: ${JAVA_VERSION}${NC}"
echo ""

# Check the JasperReports library
echo -e "${YELLOW}Step 2: Checking the JasperReports library${NC}"
if [ -f "$LIB_DIR/$JASPERREPORTS_JAR" ]; then
    echo -e "${GREEN}✓ JasperReports library already exists: ${LIB_DIR}/${JASPERREPORTS_JAR}${NC}"
else
    echo -e "${YELLOW}Downloading JasperReports ${JASPERREPORTS_VERSION}...${NC}"
    echo "Download URL: $JASPERREPORTS_URL"

    # Download using wget or curl
    if command -v wget &> /dev/null; then
        wget -O "$LIB_DIR/$JASPERREPORTS_JAR" "$JASPERREPORTS_URL"
    elif command -v curl &> /dev/null; then
        curl -L -o "$LIB_DIR/$JASPERREPORTS_JAR" "$JASPERREPORTS_URL"
    else
        echo -e "${RED}✗ Cannot download: please install wget or curl${NC}"
        exit 1
    fi

    if [ -f "$LIB_DIR/$JASPERREPORTS_JAR" ]; then
        echo -e "${GREEN}✓ JasperReports library download complete${NC}"
    else
        echo -e "${RED}✗ Download failed${NC}"
        exit 1
    fi
fi
echo ""

# Compile JRXMLCompiler.java
echo -e "${YELLOW}Step 3: Compiling JRXMLCompiler${NC}"
javac -cp "$LIB_DIR/$JASPERREPORTS_JAR" "$SCRIPT_DIR/JRXMLCompiler.java" 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ JRXMLCompiler compiled successfully${NC}"
else
    echo -e "${RED}✗ Compilation failed${NC}"
    exit 1
fi
echo ""

# Generate test cases
echo -e "${YELLOW}Step 4: Generating test cases${NC}"
cat > "$TEST_DIR/test_textfield.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestTextField"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-textfield-001">

    <field name="fieldName" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField isBlankWhenNull="true">
                <reportElement x="0" y="0" width="200" height="20" uuid="text-001"/>
                <textElement textAlignment="Left" verticalAlignment="Top">
                    <font fontName="SansSerif" size="12"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{fieldName}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>
EOF

cat > "$TEST_DIR/test_textfield_styled.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestTextFieldStyled"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-textfield-styled-001">

    <field name="amount" class="java.math.BigDecimal"/>

    <style name="AmountStyle" mode="Opaque" backcolor="#FFFFFF" forecolor="#000000">
        <box>
            <pen lineWidth="0.5" lineColor="#000000"/>
            <topPen lineWidth="0.5" lineColor="#000000"/>
            <leftPen lineWidth="0.5" lineColor="#000000"/>
            <bottomPen lineWidth="0.5" lineColor="#000000"/>
            <rightPen lineWidth="0.5" lineColor="#000000"/>
        </box>
        <textElement textAlignment="Right" verticalAlignment="Middle">
            <font fontName="Arial" size="10"/>
        </textElement>
    </style>

    <detail>
        <band height="30">
            <textField pattern="#,##0.00" isBlankWhenNull="true" style="AmountStyle">
                <reportElement x="0" y="0" width="150" height="20" uuid="text-001"/>
                <textFieldExpression><![CDATA[$F{amount}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>
EOF

cat > "$TEST_DIR/test_statictext.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestStaticText"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-statictext-001">

    <title>
        <band height="50">
            <staticText>
                <reportElement x="0" y="0" width="200" height="30" uuid="text-001"/>
                <textElement textAlignment="Center" verticalAlignment="Middle">
                    <font fontName="Arial" size="16" isBold="true"/>
                </textElement>
                <text><![CDATA[Report Title]]></text>
            </staticText>
        </band>
    </title>
</jasperReport>
EOF

cat > "$TEST_DIR/test_image.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestImage"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-image-001">

    <title>
        <band height="100">
            <image hAlign="Center" vAlign="Middle">
                <reportElement x="0" y="0" width="100" height="100" uuid="img-001"/>
                <imageExpression><![CDATA["https://example.com/logo.png"]]>
                </imageExpression>
            </image>
        </band>
    </title>
</jasperReport>
EOF

cat > "$TEST_DIR/test_rectangle.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestRectangle"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-rectangle-001">

    <detail>
        <band height="50">
            <rectangle>
                <reportElement x="0" y="0" width="200" height="50" uuid="rect-001"/>
                <graphicElement>
                    <pen lineWidth="1.0"/>
                </graphicElement>
            </rectangle>
        </band>
    </detail>
</jasperReport>
EOF

cat > "$TEST_DIR/test_textfield_box.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestTextFieldBox"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-textfield-box-001">

    <field name="data" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField>
                <reportElement x="0" y="0" width="200" height="20" uuid="text-001"/>
                <box>
                    <pen lineWidth="1.0" lineColor="#000000"/>
                    <topPen lineWidth="1.0" lineColor="#000000"/>
                    <leftPen lineWidth="1.0" lineColor="#000000"/>
                    <bottomPen lineWidth="1.0" lineColor="#000000"/>
                    <rightPen lineWidth="1.0" lineColor="#000000"/>
                    <topPadding leftPadding="5"/>
                    <leftPadding leftPadding="5"/>
                </box>
                <textElement textAlignment="Left" verticalAlignment="Middle">
                    <font fontName="Arial" size="10"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{data}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>
EOF

echo -e "${GREEN}✓ Test cases generated at: ${TEST_DIR}${NC}"
echo ""

# Run compilation validation
echo -e "${YELLOW}Step 5: Running compilation validation${NC}"
echo ""

PASSED=0
FAILED=0
TOTAL=0

for test_file in "$TEST_DIR"/*.jrxml; do
    if [ -f "$test_file" ]; then
        TOTAL=$((TOTAL + 1))
        filename=$(basename "$test_file")
        output_file="$OUTPUT_DIR/${filename%.jrxml}.jasper"

        echo -e "${BLUE}Test $TOTAL: $filename${NC}"

        # Run the Java compiler
        java -cp "$SCRIPT_DIR:$LIB_DIR/$JASPERREPORTS_JAR" JRXMLCompiler "$test_file" "$output_file" 2>&1

        if [ $? -eq 0 ]; then
            PASSED=$((PASSED + 1))
            echo -e "${GREEN}✓ Compilation succeeded${NC}"
        else
            FAILED=$((FAILED + 1))
            echo -e "${RED}✗ Compilation failed${NC}"
        fi
        echo ""
    fi
done

# Print result summary
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}Test result summary${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Total tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! The JRXML can be successfully compiled by JasperReports${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed, please check the JRXML format${NC}"
    exit 1
fi
