import { describe, test, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateJRXMLContent, parseJRXMLContent } from '../../src/utils/jrxmlGenerator';

// Helper function to parse JRXML content into a DOM object
function parseJRXMLToDOM(jrxmlContent: string) {
  const dom = new JSDOM(jrxmlContent, { contentType: 'application/xml' });
  return dom.window.document;
}

describe('Test that no box tag is generated when the border width is 0', () => {
  test('no box tag is generated when the global border width is 0', () => {
    const jrxmlWithZeroBorder = `
    <jasperReport>
      <detail>
        <band height="100">
          <staticText>
            <reportElement x="10" y="10" width="100" height="20">
              <box>
                <pen lineWidth="0"/>
              </box>
            </reportElement>
            <text><![CDATA[Test Text]]></text>
          </staticText>
        </band>
      </detail>
    </jasperReport>
    `;

    const parsedData = parseJRXMLContent(jrxmlWithZeroBorder);
    const generatedJRXML = generateJRXMLContent(
      parsedData.properties,
      parsedData.bands,
      parsedData.fields || [],
      parsedData.parameters || []
    );

    // Verify that the generated JRXML does not contain a box tag
    const doc = parseJRXMLToDOM(generatedJRXML);
    const staticTextElements = doc.querySelectorAll('staticText');
    expect(staticTextElements.length).toBeGreaterThan(0);

    // Check that no box tag was generated
    const boxElement = staticTextElements[0].querySelector('box');
    expect(boxElement).toBeNull();
  });

  test('no corresponding pen tag is generated when a side border width is 0', () => {
    const jrxmlWithZeroBorders = `
    <jasperReport>
      <detail>
        <band height="100">
          <staticText>
            <reportElement x="10" y="10" width="100" height="20">
              <box>
                <topPen lineWidth="0"/>
                <leftPen lineWidth="0"/>
                <bottomPen lineWidth="0"/>
                <rightPen lineWidth="0"/>
              </box>
            </reportElement>
            <text><![CDATA[Test Text]]></text>
          </staticText>
        </band>
      </detail>
    </jasperReport>
    `;

    const parsedData = parseJRXMLContent(jrxmlWithZeroBorders);
    const generatedJRXML = generateJRXMLContent(
      parsedData.properties,
      parsedData.bands,
      parsedData.fields || [],
      parsedData.parameters || []
    );

    // Verify that the generated JRXML does not contain any pen tags
    const doc = parseJRXMLToDOM(generatedJRXML);
    const staticTextElements = doc.querySelectorAll('staticText');
    expect(staticTextElements.length).toBeGreaterThan(0);

    // Check that no box tag was generated
    const boxElement = staticTextElements[0].querySelector('box');
    expect(boxElement).toBeNull();
  });
});
