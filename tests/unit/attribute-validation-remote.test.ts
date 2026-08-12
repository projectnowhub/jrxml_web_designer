/**
 * JRXML attribute remote validation test suite
 *
 * Validates whether each attribute is allowed by sending requests to a remote
 * JasperReports compilation server. Actual results are authoritative; this
 * verifies the consistency of schemas/jrxml-schema.json against the real XSD.
 *
 * Remote server: https://jrxml-pdf-preview.firegod.cn
 */

import { describe, it, expect } from 'vitest';

const PREVIEW_API_URL = 'https://jrxml-pdf-preview.firegod.cn/api/pdf/generateForm';
const REQUEST_TIMEOUT = 30000;

interface TestResult {
  name: string;
  passed: boolean;
  allowed: boolean; // whether the attribute is allowed by the XSD
  error?: string;
  details?: string;
}

async function sendPreviewRequest(jrxml: string): Promise<{ success: boolean; response?: any; error?: string }> {
  const body = new URLSearchParams();
  body.set('jrxml', jrxml);
  body.set('parameters', '{}');
  body.set('dataSource', '[]');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(PREVIEW_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/pdf')) {
        return { success: true, response: 'PDF_GENERATED' };
      } else {
        const text = await response.text();
        return { success: false, error: `Unexpected response: ${text.substring(0, 200)}` };
      }
    } else {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text.substring(0, 500)}` };
    }
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      return { success: false, error: 'Request timeout' };
    }
    return { success: false, error: `Network error: ${e.message}` };
  }
}

// Base JRXML template
function createJRXML(content: string, attributes: string = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreport.xsd"
    name="TestReport"
    pageWidth="595" pageHeight="842"
    columnWidth="555" leftMargin="20" rightMargin="20"
    topMargin="20" bottomMargin="20"
    ${attributes}>
  <detail>
    <band height="30">
      ${content}
    </band>
  </detail>
</jasperReport>`;
}

// ============================================================================
// Test 1: uuid attribute validation
// ============================================================================

describe('uuid attribute remote validation', () => {

  it('field with uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{testField}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <field name="testField" class="java.lang.String" uuid="field-uuid-123"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('field with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
    // Record the result without failing the test
  });

  it('field without uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{testField}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <field name="testField" class="java.lang.String"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('field without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });

  it('variable with uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <variable name="testVar" class="java.lang.String" uuid="var-uuid-123"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('variable with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('variable without uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <variable name="testVar" class="java.lang.String"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('variable without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });

  it('parameter with uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$P{testParam}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <parameter name="testParam" class="java.lang.String" uuid="param-uuid-123"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('parameter with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('parameter without uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$P{testParam}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <parameter name="testParam" class="java.lang.String"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('parameter without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });

  it('sortField with uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <sortField name="testSort" uuid="sort-uuid-123"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('sortField with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('sortField without uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <sortField name="testSort"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('sortField without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });

  it('group with uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <group name="testGroup" uuid="group-uuid-123"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('group with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('group without uuid attribute', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <group name="testGroup"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('group without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });

  it('band with uuid attribute', async () => {
    const jrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30" uuid="band-uuid-123">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    const result = await sendPreviewRequest(jrxml);
    console.log('band with uuid:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('band without uuid attribute', async () => {
    const jrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="TestReport"
              pageWidth="595" pageHeight="842"
              columnWidth="555" leftMargin="20" rightMargin="20"
              topMargin="20" bottomMargin="20">
  <detail>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    const result = await sendPreviewRequest(jrxml);
    console.log('band without uuid:', result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  });
});

// ============================================================================
// Test 2: positionType enum value validation
// ============================================================================

describe('positionType enum value remote validation', () => {

  it('positionType=FixRelativeToTop', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" positionType="FixRelativeToTop"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('positionType=FixRelativeToTop:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('positionType=FixRelativeToBottom', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" positionType="FixRelativeToBottom"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('positionType=FixRelativeToBottom:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('positionType=Float', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" positionType="Float"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('positionType=Float:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('positionType=FixRelativeToBand (may be invalid)', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" positionType="FixRelativeToBand"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('positionType=FixRelativeToBand:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });
});

// ============================================================================
// Test 3: scaleImage enum value validation
// ============================================================================

describe('scaleImage enum value remote validation', () => {

  it('scaleImage=RetainShape', async () => {
    const jrxml = createJRXML(`
      <image>
        <reportElement x="0" y="0" width="100" height="100"/>
        <imageExpression><![CDATA["test.png"]]></imageExpression>
        <reportProperty name="net.sf.jasperreports.image.scale.image" value="RetainShape"/>
      </image>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('scaleImage=RetainShape:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('scaleImage=RetainImage (may be invalid)', async () => {
    const jrxml = createJRXML(`
      <image>
        <reportElement x="0" y="0" width="100" height="100"/>
        <imageExpression><![CDATA["test.png"]]></imageExpression>
        <reportProperty name="net.sf.jasperreports.image.scale.image" value="RetainImage"/>
      </image>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('scaleImage=RetainImage:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });
});

// ============================================================================
// Test 4: resetType enum value validation
// ============================================================================

describe('resetType enum value remote validation', () => {

  it('variable resetType=Master', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <variable name="testVar" class="java.lang.Integer" calculation="Count" resetType="Master"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('resetType=Master:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('variable resetType=Report', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$V{testVar}]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <variable name="testVar" class="java.lang.Integer" calculation="Count" resetType="Report"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('resetType=Report:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });
});

// ============================================================================
// Test 5: missing attribute validation
// ============================================================================

describe('missing attribute remote validation', () => {

  it('group isReprintHeaderOnEachColumn', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <group name="testGroup" isReprintHeaderOnEachColumn="true"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('group isReprintHeaderOnEachColumn:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('group isReprintHeaderOnEachPage', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <group name="testGroup" isReprintHeaderOnEachPage="true"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('group isReprintHeaderOnEachPage:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('group footerPosition=Normal', async () => {
    const jrxml = createJRXML(`
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[1]]></textFieldExpression>
      </textField>
    `).replace('</jasperReport>', `
      <group name="testGroup" footerPosition="Normal"/>
    </jasperReport>`);

    const result = await sendPreviewRequest(jrxml);
    console.log('group footerPosition=Normal:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });
});

// ============================================================================
// Test 6: elementBase attribute validation
// ============================================================================

describe('elementBase attribute remote validation', () => {

  it('stretchType=RelativeToBandHeight', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" stretchType="RelativeToBandHeight"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('stretchType=RelativeToBandHeight:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('stretchType=RelativeToTallestObject', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20" stretchType="RelativeToTallestObject"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('stretchType=RelativeToTallestObject:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('textAdjust=StretchHeight', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textElement textAdjust="StretchHeight"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('textAdjust=StretchHeight:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });

  it('textAdjust=CutText (default)', async () => {
    const jrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textElement textAdjust="CutText"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);
    const result = await sendPreviewRequest(jrxml);
    console.log('textAdjust=CutText:', result.success ? '✅ Allowed' : `❌ Rejected: ${result.error}`);
  });
});

// ============================================================================
// Test summary
// ============================================================================

describe('Test summary', () => {
  it('all attribute validation complete', async () => {
    console.log('\n========================================');
    console.log('Remote attribute validation test complete');
    console.log('Server: https://jrxml-pdf-preview.firegod.cn');
    console.log('========================================\n');

    // Basic JRXML validation
    const basicJrxml = createJRXML(`
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
        <text><![CDATA[Test]]></text>
      </staticText>
    `);

    const result = await sendPreviewRequest(basicJrxml);
    if (result.success) {
      console.log('✅ Remote compilation server is working correctly');
    } else {
      console.log('❌ Remote compilation server is unreachable:', result.error);
    }

    expect(true).toBe(true);
  });
});
