// @ts-nocheck
/**
 * JRXML compilation validator
 * Used to verify that the generated JRXML conforms to the JasperReports spec
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ValidationRule {
  name: string;
  validate: (content: string) => boolean;
  errorMessage: string;
}

export class JRXMLValidator {
  private rules: ValidationRule[] = [];

  constructor() {
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    // Rule 1: XML declaration
    this.rules.push({
      name: 'XML declaration',
      validate: (content) => content.trim().startsWith('<?xml version="1.0"'),
      errorMessage: 'JRXML must start with an XML declaration'
    });

    // Rule 2: jasperReport root element
    this.rules.push({
      name: 'jasperReport root element',
      validate: (content) => /<jasperReport[\s>]/.test(content),
      errorMessage: 'Missing jasperReport root element'
    });

    // Rule 3: Required jasperReport attributes
    this.rules.push({
      name: 'jasperReport required attributes',
      validate: (content) => {
        const requiredAttrs = ['name', 'pageWidth', 'pageHeight', 'columnWidth'];
        return requiredAttrs.every(attr => new RegExp(`${attr}="[^"]*"`).test(content));
      },
      errorMessage: 'jasperReport is missing required attributes (name, pageWidth, pageHeight, columnWidth)'
    });

    // Rule 4: UUID attribute
    this.rules.push({
      name: 'UUID attribute',
      validate: (content) => /uuid="[^"]*"/.test(content),
      errorMessage: 'jasperReport is missing the uuid attribute'
    });

    // Rule 5: UUID inside reportElement
    this.rules.push({
      name: 'reportElement UUID',
      validate: (content) => {
        const reportElements = content.match(/<reportElement[^>]*>/g) || [];
        return reportElements.every(elem => /uuid="[^"]*"/.test(elem));
      },
      errorMessage: 'reportElement is missing the uuid attribute'
    });

    // Rule 6: TextField expression
    this.rules.push({
      name: 'TextField expression',
      validate: (content) => {
        if (!content.includes('<textField')) return true;
        return content.includes('<textFieldExpression>');
      },
      errorMessage: 'textField is missing textFieldExpression'
    });

    // Rule 7: Image expression
    this.rules.push({
      name: 'Image expression',
      validate: (content) => {
        if (!content.includes('<image>')) return true;
        return content.includes('<imageExpression>');
      },
      errorMessage: 'image is missing imageExpression'
    });

    // Rule 8: band attribute
    this.rules.push({
      name: 'band attribute',
      validate: (content) => {
        const bands = content.match(/<band[^>]*>/g) || [];
        return bands.every(band => /height="\d+"/.test(band));
      },
      errorMessage: 'band is missing the height attribute'
    });

    // Rule 9: Field definition syntax
    this.rules.push({
      name: 'Field definition syntax',
      validate: (content) => {
        const fields = content.match(/<field[^>]*>/g) || [];
        return fields.every(field => /name="[^"]*"/.test(field) && /class="[^"]*"/.test(field));
      },
      errorMessage: 'field is missing the name or class attribute'
    });

    // Rule 10: Style reference validity
    this.rules.push({
      name: 'Style reference validity',
      validate: (content) => {
        const styles = content.match(/<style[^>]*name="([^"]*)"/g) || [];
        const styleNames = styles.map(s => s.match(/name="([^"]*)"/)?.[1] || '');

        const elements = content.match(/style="([^"]*)"/g) || [];
        const referencedStyles = elements.map(e => e.match(/style="([^"]*)"/)?.[1] || '');

        return referencedStyles.every(ref => styleNames.includes(ref) || ref === '');
      },
      errorMessage: 'A referenced style is not defined'
    });

    // Rule 11: Expression syntax
    this.rules.push({
      name: 'Expression syntax',
      validate: (content) => {
        const expressions = content.match(/<textFieldExpression><!\[CDATA\[(.*?)\]\]><\/textFieldExpression>/g) || [];
        return expressions.every(expr => {
          const exprContent = expr.match(/CDATA\[(.*?)\]/)?.[1] || '';
          // Basic expression syntax check
          return exprContent.includes('$F{') || exprContent.includes('"') || exprContent.includes('$P{');
        });
      },
      errorMessage: 'Expression syntax error'
    });

    // Rule 12: Element position validity
    this.rules.push({
      name: 'Element position validity',
      validate: (content) => {
        const elements = content.match(/<reportElement[^>]*>/g) || [];
        return elements.every(elem => {
          const x = parseInt(elem.match(/x="(\d+)"/)?.[1] || '0');
          const y = parseInt(elem.match(/y="(\d+)"/)?.[1] || '0');
          const width = parseInt(elem.match(/width="(\d+)"/)?.[1] || '0');
          const height = parseInt(elem.match(/height="(\d+)"/)?.[1] || '0');
          return x >= 0 && y >= 0 && width >= 0 && height >= 0;
        });
      },
      errorMessage: 'Element position or size is invalid'
    });

    // Rule 13: Font attribute validity
    this.rules.push({
      name: 'Font attribute validity',
      validate: (content) => {
        const fonts = content.match(/<font[^>]*>/g) || [];
        return fonts.every(font => {
          const size = font.match(/size="(\d+)"/)?.[1];
          return !size || parseInt(size) > 0;
        });
      },
      errorMessage: 'Invalid font size'
    });

    // Rule 14: Border attribute validity
    this.rules.push({
      name: 'Border attribute validity',
      validate: (content) => {
        const pens = content.match(/<pen[^>]*>/g) || [];
        return pens.every(pen => {
          const lineWidth = pen.match(/lineWidth="([^"]*)"/)?.[1];
          if (!lineWidth) return true;
          const width = parseFloat(lineWidth);
          return !isNaN(width) && width >= 0;
        });
      },
      errorMessage: 'Invalid border width'
    });
  }

  /**
   * Validate JRXML content
   */
  validate(content: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.rules) {
      try {
        if (!rule.validate(content)) {
          errors.push(`[${rule.name}] ${rule.errorMessage}`);
        }
      } catch (error) {
        warnings.push(`[${rule.name}] An error occurred during validation: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a JRXML file
   */
  validateFile(filePath: string): { valid: boolean; errors: string[]; warnings: string[] } {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.validate(content);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to read file: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Generate a validation report
   */
  generateReport(content: string, fileName: string = 'JRXML Report'): string {
    const result = this.validate(content);
    const timestamp = new Date().toISOString();

    let report = `
=================================================================
JRXML Validation Report
=================================================================
File: ${fileName}
Time: ${timestamp}
Status: ${result.valid ? '✅ Passed' : '❌ Failed'}
=================================================================

Details:
`;

    if (result.errors.length > 0) {
      report += `\nErrors (${result.errors.length}):\n`;
      result.errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      report += `\nWarnings (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`;
      });
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      report += `\n✅ All validation rules passed\n`;
    }

    report += `\n=================================================================\n`;

    return report;
  }
}

// Export a singleton instance
export const jrxmlValidator = new JRXMLValidator();

// Usage example
if (require.main === module) {
  const validator = new JRXMLValidator();

  const testJRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestReport"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-report-001">

    <field name="fieldName" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField>
                <reportElement x="0" y="0" width="200" height="20" uuid="..."/>
                <textElement textAlignment="Left" verticalAlignment="Top">
                    <font fontName="SansSerif" size="12"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{fieldName}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`;

  console.log(validator.generateReport(testJRXML, 'test_report.jrxml'));
}
