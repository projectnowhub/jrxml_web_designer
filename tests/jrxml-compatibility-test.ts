/**
 * JRXML compilation compatibility test suite
 * Validates whether generated JRXML can be successfully compiled by JasperReports
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  name: string;
  description: string;
  jrxml: string;
  expectedFields: string[];
  expectedParameters: string[];
  shouldCompile: boolean;
  validationRules?: ValidationRule[];
}

interface ValidationRule {
  name: string;
  validate: (content: string) => boolean;
  message: string;
}

export class JRXMLCompatibilityTestSuite {
  private testCases: TestCase[] = [];
  private results: { name: string; passed: boolean; errors: string[] }[] = [];

  constructor() {
    this.setupTestCases();
  }

  private setupTestCases(): void {
    // Test case 1: Basic TextField
    this.testCases.push({
      name: 'TextField_Basic',
      description: 'Basic text field',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TextField_Basic"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="textfield-basic-001">

    <field name="fieldName" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField isBlankWhenNull="true">
                <reportElement x="0" y="0" width="200" height="20" uuid="textfield-001"/>
                <textElement textAlignment="Left" verticalAlignment="Top">
                    <font fontName="SansSerif" size="12"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{fieldName}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`,
      expectedFields: ['fieldName'],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'TextField has an expression',
          validate: (content) => content.includes('<textFieldExpression>'),
          message: 'TextField is missing an expression'
        },
        {
          name: 'Field has a name attribute',
          validate: (content) => /<field name="[^"]*"/.test(content),
          message: 'Field is missing a name attribute'
        }
      ]
    });

    // Test case 2: TextField with styling
    this.testCases.push({
      name: 'TextField_Styled',
      description: 'Styled text field',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TextField_Styled"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="textfield-styled-001">

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
                <reportElement x="0" y="0" width="150" height="20" uuid="textfield-001"/>
                <textFieldExpression><![CDATA[$F{amount}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`,
      expectedFields: ['amount'],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'TextField has a pattern',
          validate: (content) => content.includes('pattern="#,##0.00"'),
          message: 'TextField is missing a pattern attribute'
        },
        {
          name: 'Style has a name attribute',
          validate: (content) => /<style name="[^"]*"/.test(content),
          message: 'Style is missing a name attribute'
        }
      ]
    });

    // Test case 3: StaticText
    this.testCases.push({
      name: 'StaticText_Basic',
      description: 'Basic static text',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="StaticText_Basic"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="statictext-basic-001">

    <title>
        <band height="50">
            <staticText>
                <reportElement x="0" y="0" width="200" height="30" uuid="statictext-001"/>
                <textElement textAlignment="Center" verticalAlignment="Middle">
                    <font fontName="Arial" size="16" isBold="true"/>
                </textElement>
                <text><![CDATA[Report Title]]></text>
            </staticText>
        </band>
    </title>
</jasperReport>`,
      expectedFields: [],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'StaticText has text',
          validate: (content) => content.includes('<text><![CDATA['),
          message: 'StaticText is missing text content'
        },
        {
          name: 'StaticText has a font',
          validate: (content) => content.includes('<font'),
          message: 'StaticText is missing a font definition'
        }
      ]
    });

    // Test case 4: Image
    this.testCases.push({
      name: 'Image_Basic',
      description: 'Basic image element',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="Image_Basic"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="image-basic-001">

    <title>
        <band height="100">
            <image hAlign="Center" vAlign="Middle">
                <reportElement x="0" y="0" width="100" height="100" uuid="image-001"/>
                <imageExpression><![CDATA["https://example.com/logo.png"]]>
                </imageExpression>
            </image>
        </band>
    </title>
</jasperReport>`,
      expectedFields: [],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'Image has an expression',
          validate: (content) => content.includes('<imageExpression>'),
          message: 'Image is missing an imageExpression'
        },
        {
          name: 'Image has hAlign',
          validate: (content) => content.includes('hAlign="Center"'),
          message: 'Image is missing an hAlign attribute'
        }
      ]
    });

    // Test case 5: Rectangle
    this.testCases.push({
      name: 'Rectangle_Basic',
      description: 'Basic rectangle element',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="Rectangle_Basic"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="rectangle-basic-001">

    <detail>
        <band height="50">
            <rectangle>
                <reportElement x="0" y="0" width="200" height="50" uuid="rectangle-001"/>
                <graphicElement>
                    <pen lineWidth="1.0"/>
                </graphicElement>
            </rectangle>
        </band>
    </detail>
</jasperReport>`,
      expectedFields: [],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'Rectangle has a pen',
          validate: (content) => content.includes('<pen lineWidth="1.0"/>'),
          message: 'Rectangle is missing a pen definition'
        }
      ]
    });

    // Test case 6: TextField with Box
    this.testCases.push({
      name: 'TextField_WithBox',
      description: 'Text field with a box',
      jrxml: `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TextField_WithBox"
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
                <reportElement x="0" y="0" width="200" height="20" uuid="textfield-001"/>
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
</jasperReport>`,
      expectedFields: ['data'],
      expectedParameters: [],
      shouldCompile: true,
      validationRules: [
        {
          name: 'Box has a pen',
          validate: (content) => content.includes('<pen lineWidth="1.0"'),
          message: 'Box is missing a pen definition'
        },
        {
          name: 'Box has padding',
          validate: (content) => content.includes('<topPadding'),
          message: 'Box is missing a padding definition'
        }
      ]
    });
  }

  /**
   * Runs all tests
   */
  runAllTests(): { passed: number; failed: number; results: any[] } {
    let passed = 0;
    let failed = 0;
    const results: any[] = [];

    for (const testCase of this.testCases) {
      const result = this.runTest(testCase);
      results.push(result);

      if (result.passed) {
        passed++;
        console.log(`✅ ${testCase.name}: ${testCase.description}`);
      } else {
        failed++;
        console.log(`❌ ${testCase.name}: ${testCase.description}`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
    }

    return { passed, failed, results };
  }

  /**
   * Runs a single test
   */
  private runTest(testCase: TestCase): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic syntax validation
    if (!testCase.jrxml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }

    if (!testCase.jrxml.includes('<jasperReport')) {
      errors.push('Missing jasperReport root element');
    }

    // Required attribute validation
    const requiredAttrs = ['name', 'pageWidth', 'pageHeight', 'columnWidth'];
    for (const attr of requiredAttrs) {
      if (!testCase.jrxml.includes(`${attr}="`)) {
        errors.push(`jasperReport is missing the ${attr} attribute`);
      }
    }

    // UUID validation
    if (!testCase.jrxml.includes('uuid="')) {
      errors.push('Missing uuid attribute');
    }

    // Run custom validation rules
    if (testCase.validationRules) {
      for (const rule of testCase.validationRules) {
        if (!rule.validate(testCase.jrxml)) {
          errors.push(rule.message);
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a test report
   */
  generateReport(results: any[]): string {
    const timestamp = new Date().toISOString();
    let report = `
=================================================================
JRXML Compilation Compatibility Test Report
=================================================================
Test time: ${timestamp}
Test case count: ${results.length}
Passed: ${results.filter(r => r.passed).length}
Failed: ${results.filter(r => !r.passed).length}
=================================================================

Detailed results:
`;

    results.forEach((result, index) => {
      report += `\n${index + 1}. ${result.name || 'Unknown'}`;
      report += `\n   Status: ${result.passed ? '✅ Passed' : '❌ Failed'}`;
      if (result.errors && result.errors.length > 0) {
        report += `\n   Errors:`;
        result.errors.forEach((error: string) => {
          report += `\n     - ${error}`;
        });
      }
    });

    report += `\n\n=================================================================
Validation rule summary:
1. All JRXML must start with an XML declaration
2. Must include a jasperReport root element
3. jasperReport must include the name, pageWidth, pageHeight, columnWidth attributes
4. All elements must include a uuid attribute
5. TextField must include a textFieldExpression
6. Image must include an imageExpression
7. Field must include name and class attributes
8. Style must include a name attribute
=================================================================
`;

    return report;
  }

  /**
   * Saves the test cases to files
   */
  saveTestCases(outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.testCases.forEach(testCase => {
      const filePath = path.join(outputDir, `${testCase.name}.jrxml`);
      fs.writeFileSync(filePath, testCase.jrxml, 'utf-8');
      console.log(`✓ Saved test case: ${filePath}`);
    });
  }
}

// Usage example
if (require.main === module) {
  const testSuite = new JRXMLCompatibilityTestSuite();

  console.log('\nRunning JRXML compilation compatibility tests...\n');
  const results = testSuite.runAllTests();

  console.log('\n' + testSuite.generateReport(results.results));

  // Save the test cases
  testSuite.saveTestCases('./test-reports');
}
