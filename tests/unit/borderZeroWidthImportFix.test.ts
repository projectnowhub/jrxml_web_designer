import { describe, it, expect } from 'vitest';
import { parseJRXMLContent } from '../../src/utils/jrxmlGenerator';

describe('JRXML zero-width border import test', () => {
  it('when lineWidth is 0 on all sides in the JRXML, all borders should not be shown after parsing', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842" whenNoDataType="AllSectionsNoDetail">
  <detail>
    <band height="50">
      <staticText>
        <reportElement x="0" y="0" width="800" height="50"/>
        <box topPadding="0" leftPadding="0" bottomPadding="0" rightPadding="0">
          <topPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <leftPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <bottomPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <rightPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement textAlignment="Center" verticalAlignment="Middle">
          <font fontName="Noto Serif SC" size="19"/>
        </textElement>
        <text><![CDATA[Passenger Center Verification Receipt]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);

    // Get the first element of the detail band
    const detailBand = result.bands.find(band => band.type === 'detail');
    expect(detailBand).toBeDefined();
    expect(detailBand!.elements.length).toBeGreaterThan(0);

    const element = detailBand!.elements[0];

    // Check whether the box property exists
    expect(element.box).toBeDefined();

    // Check the pen properties within box
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(0);
    expect(element.box.leftPen).toBeDefined();
    expect(element.box.leftPen.lineWidth).toBe(0);
    expect(element.box.bottomPen).toBeDefined();
    expect(element.box.bottomPen.lineWidth).toBe(0);
    expect(element.box.rightPen).toBeDefined();
    expect(element.box.rightPen.lineWidth).toBe(0);
  });

  it('when lineWidth is 0 on only some sides in the JRXML, only the borders with lineWidth greater than 0 should be shown after parsing', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842" whenNoDataType="AllSectionsNoDetail">
  <detail>
    <band height="50">
      <staticText>
        <reportElement x="0" y="0" width="800" height="50"/>
        <box topPadding="0" leftPadding="0" bottomPadding="0" rightPadding="0">
          <topPen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
          <leftPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
          <bottomPen lineWidth="2" lineStyle="Solid" lineColor="#000000"/>
          <rightPen lineWidth="0" lineStyle="Solid" lineColor="#000000"/>
        </box>
        <textElement textAlignment="Center" verticalAlignment="Middle">
          <font fontName="Noto Serif SC" size="19"/>
        </textElement>
        <text><![CDATA[Partial Border Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);

    // Get the first element of the detail band
    const detailBand = result.bands.find(band => band.type === 'detail');
    expect(detailBand).toBeDefined();
    expect(detailBand!.elements.length).toBeGreaterThan(0);

    const element = detailBand!.elements[0];

    // Check whether the box property exists
    expect(element.box).toBeDefined();

    // Check the pen properties within box
    expect(element.box.topPen).toBeDefined();
    expect(element.box.topPen.lineWidth).toBe(1);
    expect(element.box.leftPen).toBeDefined();
    expect(element.box.leftPen.lineWidth).toBe(0);
    expect(element.box.bottomPen).toBeDefined();
    expect(element.box.bottomPen.lineWidth).toBe(2);
    expect(element.box.rightPen).toBeDefined();
    expect(element.box.rightPen.lineWidth).toBe(0);
  });

  it('when there is no box element in the JRXML, the border property should be empty', () => {
    const jrxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="test" pageWidth="595" pageHeight="842" whenNoDataType="AllSectionsNoDetail">
  <detail>
    <band height="50">
      <staticText>
        <reportElement x="0" y="0" width="800" height="50"/>
        <textElement textAlignment="Center" verticalAlignment="Middle">
          <font fontName="Noto Serif SC" size="19"/>
        </textElement>
        <text><![CDATA[No Border Test]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

    const result = parseJRXMLContent(jrxmlContent);

    // Get the first element of the detail band
    const detailBand = result.bands.find(band => band.type === 'detail');
    expect(detailBand).toBeDefined();
    expect(detailBand!.elements.length).toBeGreaterThan(0);

    const element = detailBand!.elements[0];

    // Check whether the box property is absent
    expect(element.box).toBeUndefined();
  });
});
