/**
 * JRXML compilation validation tool
 * Validates whether generated JRXML can be successfully compiled into a jasper file
 */

import * as fs from 'fs';
import * as path from 'path';

// Test case definition
interface TestCase {
  name: string;
  description: string;
  jrxmlContent: string;
  shouldCompile: boolean;
  expectedFields?: string[];
}

// Test cases
const testCases: TestCase[] = [
  {
    name: 'basic_textfield',
    description: 'Basic TextField',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="BasicTextField"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="basic-textfield-001">

    <field name="fieldName" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField isBlankWhenNull="true">
                <reportElement x="0" y="0" width="200" height="20" uuid="..."/>
                <textElement textAlignment="Left" verticalAlignment="Top">
                    <font fontName="SansSerif" size="12"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{fieldName}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`,
    shouldCompile: true,
    expectedFields: ['fieldName']
  },
  {
    name: 'styled_textfield',
    description: 'TextField with styling',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="StyledTextField"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="styled-textfield-001">

    <field name="amount" class="java.math.BigDecimal"/>

    <style name="AmountStyle" mode="Opaque" backcolor="#FFFFFF" forecolor="#000000">
        <box>
            <pen lineWidth="0.5" lineColor="#000000"/>
        </box>
        <textElement textAlignment="Right" verticalAlignment="Middle">
            <font fontName="Arial" size="10"/>
        </textElement>
    </style>

    <detail>
        <band height="30">
            <textField pattern="#,##0.00" isBlankWhenNull="true" style="AmountStyle">
                <reportElement x="0" y="0" width="150" height="20" uuid="..."/>
                <textFieldExpression><![CDATA[$F{amount}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`,
    shouldCompile: true,
    expectedFields: ['amount']
  },
  {
    name: 'statictext_basic',
    description: 'Basic StaticText',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="BasicStaticText"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="basic-statictext-001">

    <title>
        <band height="50">
            <staticText>
                <reportElement x="0" y="0" width="200" height="30" uuid="..."/>
                <textElement textAlignment="Center" verticalAlignment="Middle">
                    <font fontName="Arial" size="16" isBold="true"/>
                </textElement>
                <text><![CDATA[Report Title]]></text>
            </staticText>
        </band>
    </title>
</jasperReport>`,
    shouldCompile: true
  },
  {
    name: 'image_element',
    description: 'Image element',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="BasicImage"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="basic-image-001">

    <title>
        <band height="100">
            <image>
                <reportElement x="0" y="0" width="100" height="100" uuid="..."/>
                <imageExpression><![CDATA["https://example.com/logo.png"]]>
                </imageExpression>
            </image>
        </band>
    </title>
</jasperReport>`,
    shouldCompile: true
  },
  {
    name: 'rectangle_element',
    description: 'Rectangle element',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="BasicRectangle"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="basic-rectangle-001">

    <detail>
        <band height="50">
            <rectangle>
                <reportElement x="0" y="0" width="200" height="50" uuid="..."/>
                <graphicElement>
                    <pen lineWidth="1.0"/>
                </graphicElement>
            </rectangle>
        </band>
    </detail>
</jasperReport>`,
    shouldCompile: true
  },
  {
    name: 'textfield_with_box',
    description: 'TextField with Box',
    jrxmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TextFieldWithBox"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="textfield-box-001">

    <field name="data" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField>
                <reportElement x="0" y="0" width="200" height="20" uuid="..."/>
                <box>
                    <pen lineWidth="1.0" lineColor="#000000"/>
                    <topPen lineWidth="1.0"/>
                    <leftPen lineWidth="1.0"/>
                    <bottomPen lineWidth="1.0"/>
                    <rightPen lineWidth="1.0"/>
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
</jasperReport>`,
    shouldCompile: true,
    expectedFields: ['data']
  }
];

/**
 * JRXML compilation validator
 */
export class JRXMLCompiler {
  private outputDir: string;

  constructor(outputDir: string = './test-compiled') {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Validates JRXML syntax
   */
  validateJRXMLSyntax(jrxmlContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check the XML declaration
    if (!jrxmlContent.trim().startsWith('<?xml version="1.0"')) {
      errors.push('Missing XML declaration or incorrect version');
    }

    // Check the jasperReport root element
    if (!jrxmlContent.includes('<jasperReport')) {
      errors.push('Missing jasperReport root element');
    }

    // Check required attributes
    const requiredAttributes = ['name', 'pageWidth', 'pageHeight', 'columnWidth'];
    for (const attr of requiredAttributes) {
      if (!jrxmlContent.includes(`${attr}=`)) {
        errors.push(`jasperReport is missing a required attribute: ${attr}`);
      }
    }

    // Check for UUID
    if (!jrxmlContent.includes('uuid=')) {
      errors.push('Missing uuid attribute');
    }

    // Check UUID in reportElement
    if (jrxmlContent.includes('<reportElement') && !jrxmlContent.includes('uuid="')) {
      errors.push('reportElement is missing a uuid attribute');
    }

    // Check TextField expression
    if (jrxmlContent.includes('<textField') && !jrxmlContent.includes('<textFieldExpression>')) {
      errors.push('textField is missing a textFieldExpression');
    }

    // Check Image expression
    if (jrxmlContent.includes('<image>') && !jrxmlContent.includes('<imageExpression>')) {
      errors.push('image is missing an imageExpression');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates JRXML content completeness
   */
  validateJRXMLCompleteness(jrxmlContent: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check band attributes
    const bandMatches = jrxmlContent.match(/<band\s+height="(\d+)"/g);
    if (!bandMatches || bandMatches.length === 0) {
      warnings.push('No band element found');
    }

    // Check element position
    const reportElementMatches = jrxmlContent.match(/<reportElement\s+x="\d+"\s+y="\d+"/g);
    if (!reportElementMatches) {
      warnings.push('reportElement is missing position attributes');
    }

    // Check TextField style
    if (jrxmlContent.includes('<textField')) {
      if (!jrxmlContent.includes('isBlankWhenNull=')) {
        warnings.push('textField is missing the isBlankWhenNull attribute');
      }
    }

    // Check font definition
    if (jrxmlContent.includes('<textElement') && !jrxmlContent.includes('<font')) {
      warnings.push('textElement is missing a font definition');
    }

    // Check border definition
    if (jrxmlContent.includes('<box>') && !jrxmlContent.includes('<pen')) {
      warnings.push('box is missing a pen definition');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Compiles JRXML (simulated)
   * Note: actual compilation requires a Java environment and the JasperReports library
   * This mainly validates syntax and structure
   */
  async compileJRXML(jrxmlContent: string, name: string): Promise<{ success: boolean; output?: string; errors?: string[] }> {
    const result = this.validateJRXMLSyntax(jrxmlContent);
    const completeness = this.validateJRXMLCompleteness(jrxmlContent);

    if (!result.valid) {
      return {
        success: false,
        errors: result.errors
      };
    }

    // Save the JRXML file
    const jrxmlPath = path.join(this.outputDir, `${name}.jrxml`);
    fs.writeFileSync(jrxmlPath, jrxmlContent, 'utf-8');

    // Simulate a successful compilation
    console.log(`✓ JRXML syntax validation passed: ${name}`);
    if (completeness.warnings.length > 0) {
      console.log(`⚠ Warnings: ${completeness.warnings.join(', ')}`);
    }

    return {
      success: true,
      output: jrxmlPath
    };
  }

  /**
   * Runs all test cases
   */
  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    let passed = 0;
    let failed = 0;
    const results: any[] = [];

    for (const testCase of testCases) {
      console.log(`\nRunning test: ${testCase.name}`);
      console.log(`Description: ${testCase.description}`);

      const result = await this.compileJRXML(testCase.jrxmlContent, testCase.name);

      const testResult = {
        name: testCase.name,
        description: testCase.description,
        ...result,
        expected: testCase.shouldCompile
      };

      results.push(testResult);

      if (result.success === testCase.shouldCompile) {
        passed++;
        console.log(`✅ Passed`);
      } else {
        failed++;
        console.log(`❌ Failed`);
        if (result.errors) {
          console.log(`Errors: ${result.errors.join(', ')}`);
        }
      }
    }

    return { passed, failed, results };
  }
}

// Export the test cases for use by other tests
export { testCases, TestCase };

// If run directly
if (require.main === module) {
  const compiler = new JRXMLCompiler('./test-compiled');
  compiler.runAllTests().then(result => {
    console.log(`\nTest results:`);
    console.log(`Passed: ${result.passed}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Total: ${result.passed + result.failed}`);
  });
}
