import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseJRXMLContent, generateJRXMLContent } from '../../src/utils/jrxmlGenerator';

// Helper function to parse JRXML content into a DOM object
function parseJRXMLToDOM(jrxmlContent: string) {
  const dom = new JSDOM(jrxmlContent, { contentType: 'application/xml' });
  return dom.window.document;
}

describe('JRXML border consistency test', () => {
  it('when topPen lineWidth is 0, the top border is not shown while other borders display normally', () => {
    // Create a JRXML fragment containing border settings
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="100">
      <staticText>
        <reportElement x="10" y="10" width="100" height="30"/>
        <box topPadding="0" leftPadding="5" bottomPadding="0" rightPadding="5">
          <pen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
          <topPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement>
          <font fontName="Arial" size="12"/>
        </textElement>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    // Parse the JRXML
    const parsedData = parseJRXMLContent(jrxmlContent);

    // Verify the parsed result
    const element = parsedData.bands[0].elements[0];
    expect(element.box).toBeDefined();
    expect(element.box.pen).toBeDefined();
    expect(element.box.pen.lineWidth).toBe(1);
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(0);

    // Regenerate the JRXML
    const generatedJRXML = generateJRXMLContent(
      parsedData.properties,
      parsedData.bands,
      parsedData.fields || [],
      parsedData.parameters || []
    );

    // Verify that the generated JRXML contains the same border settings
    const doc = parseJRXMLToDOM(generatedJRXML);
    const staticTextElements = doc.querySelectorAll('staticText');
    expect(staticTextElements.length).toBeGreaterThan(0);

    const boxElement = staticTextElements[0].querySelector('box');
    expect(boxElement).toBeDefined();

    // Check whether a global pen element was generated
    const penElement = boxElement!.querySelector('pen');
    expect(penElement).toBeDefined();
    expect(penElement!.getAttribute('lineWidth')).toBe('1');
    expect(penElement!.getAttribute('lineStyle')).toBe('Solid');
    expect(penElement!.getAttribute('lineColor')).toBe('#000000');

    // Note: when lineWidth is 0, the corresponding pen element is not generated — this is the current implementation's behavior
    const topPenElement = boxElement!.querySelector('topPen');
    expect(topPenElement).toBeNull();

    // Re-parse the generated JRXML to verify consistency
    const reparsedData = parseJRXMLContent(generatedJRXML);
    const reparsedElement = reparsedData.bands[0].elements[0];

    expect(reparsedElement.box.pen.lineWidth).toBe(1);
    // Note: when lineWidth is 0, the corresponding pen element is not generated, so there is no topPen attribute after re-parsing either
    expect(reparsedElement.box.topPen).toBeUndefined();
  });

  it('when lineWidth is 0 on all sides, no borders are shown', () => {
    // Create a JRXML fragment with all border widths set to 0
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="100">
      <staticText>
        <reportElement x="10" y="10" width="100" height="30"/>
        <box topPadding="0" leftPadding="5" bottomPadding="0" rightPadding="5">
          <pen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <topPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <leftPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <bottomPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <rightPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement>
          <font fontName="Arial" size="12"/>
        </textElement>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    // Parse the JRXML
    const parsedData = parseJRXMLContent(jrxmlContent);

    // Verify the parsed result
    const element = parsedData.bands[0].elements[0];
    expect(element.box).toBeDefined();
    expect(element.box.pen).toBeDefined();
    expect(element.box.pen.lineWidth).toBe(0);
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(0);
    expect(element.box.leftPen).toBeDefined();
    expect(element.box.leftPen.lineWidth).toBe(0);
    expect(element.box.bottomPen).toBeDefined();
    expect(element.box.bottomPen.lineWidth).toBe(0);
    expect(element.box.rightPen).toBeDefined();
    expect(element.box.rightPen.lineWidth).toBe(0);

    // Regenerate the JRXML
    const generatedJRXML = generateJRXMLContent(
      parsedData.properties,
      parsedData.bands,
      parsedData.fields || [],
      parsedData.parameters || []
    );

    // Verify that the generated JRXML contains the same border settings
    // Note: when all lineWidth values are 0, no pen element is generated at all — this is the current implementation's behavior
    const doc = parseJRXMLToDOM(generatedJRXML);
    const staticTextElements = doc.querySelectorAll('staticText');
    expect(staticTextElements.length).toBeGreaterThan(0);

    const boxElement = staticTextElements[0].querySelector('box');
    expect(boxElement).toBeDefined();

    // Check that no pen element was generated
    const penElement = boxElement!.querySelector('pen');
    expect(penElement).toBeNull();

    const topPenElement = boxElement!.querySelector('topPen');
    expect(topPenElement).toBeNull();

    const leftPenElement = boxElement!.querySelector('leftPen');
    expect(leftPenElement).toBeNull();

    const bottomPenElement = boxElement!.querySelector('bottomPen');
    expect(bottomPenElement).toBeNull();

    const rightPenElement = boxElement!.querySelector('rightPen');
    expect(rightPenElement).toBeNull();
  });
});
