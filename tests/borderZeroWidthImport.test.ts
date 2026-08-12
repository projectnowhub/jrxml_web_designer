// Test whether a border with lineWidth 0 is correctly handled when importing from JRXML
import { describe, it, expect } from 'vitest';
import { parseJRXMLContent } from '../src/utils/jrxmlGenerator';

describe('Handling test for a border line width of 0 when importing from JRXML', () => {
  it('when topPen lineWidth is 0 in the JRXML, the top border should not display after parsing', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842">
  <title>
    <band height="79">
      <staticText>
        <reportElement x="20" y="20" width="200" height="40"/>
        <box>
          <topPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement>
          <font fontName="Arial" size="12"/>
        </textElement>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </title>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);
    const element = result.bands[0].elements[0];

    // Verify the parsed topPen object
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(0);
    expect(element.box.topPen.lineStyle).toBe('Solid');
    expect(element.box.topPen.lineColor).toBe('#000000');
  });

  it('when lineWidth is 0 on all sides in the JRXML, all borders should not display after parsing', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842">
  <title>
    <band height="79">
      <staticText>
        <reportElement x="20" y="20" width="200" height="40"/>
        <box>
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
  </title>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);
    const element = result.bands[0].elements[0];

    // Verify the parsed Pen objects for all sides
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(0);

    expect(element.box.leftPen).toBeDefined();
    expect(element.box.leftPen.lineWidth).toBe(0);

    expect(element.box.bottomPen).toBeDefined();
    expect(element.box.bottomPen.lineWidth).toBe(0);

    expect(element.box.rightPen).toBeDefined();
    expect(element.box.rightPen.lineWidth).toBe(0);
  });

  it('when lineWidth is 0 on only some sides in the JRXML, only the borders with lineWidth greater than 0 should display after parsing', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842">
  <title>
    <band height="79">
      <staticText>
        <reportElement x="20" y="20" width="200" height="40"/>
        <box>
          <topPen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
          <leftPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <bottomPen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
          <rightPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement>
          <font fontName="Arial" size="12"/>
        </textElement>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </title>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);
    const element = result.bands[0].elements[0];

    // Verify the parsed Pen objects
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(1);

    expect(element.box.leftPen).toBeDefined();
    expect(element.box.leftPen.lineWidth).toBe(0);

    expect(element.box.bottomPen).toBeDefined();
    expect(element.box.bottomPen.lineWidth).toBe(1);

    expect(element.box.rightPen).toBeDefined();
    expect(element.box.rightPen.lineWidth).toBe(0);
  });
});
