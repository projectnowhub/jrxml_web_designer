import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateJRXMLContent, parseJRXMLContent } from './jrxmlGenerator';

// Helper function to parse JRXML content into a DOM object
function parseJRXMLToDOM(jrxmlContent: string) {
  const dom = new JSDOM(jrxmlContent, { contentType: 'application/xml' });
  return dom.window.document;
}

describe('JRXML deprecated tag and attribute conversion tests', () => {
  describe('Deprecated attribute conversion during JRXML content generation', () => {
    it('should convert the deprecated border attribute to a pen child element', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              box: {
                pen: {
                  lineWidth: 1,
                  lineColor: '#000000'
                }
              }
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);
      
      // Check that the deprecated border and borderColor attributes are not used
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const reportElement = staticTextElements[0].querySelector('reportElement');
      expect(reportElement).toBeDefined();

      // Check that reportElement does not have the deprecated border attribute
      expect(reportElement!.getAttribute('border')).toBeNull();
      expect(reportElement!.getAttribute('borderColor')).toBeNull();

      // Check that the pen child element is used
      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeDefined();

      const penElement = boxElement!.querySelector('pen');
      expect(penElement).toBeDefined();
      expect(penElement!.getAttribute('lineWidth')).toBe('1');
      expect(penElement!.getAttribute('lineColor')).toBe('#000000');
    });

    it('should convert the deprecated isStretchWithOverflow attribute to the textAdjust attribute', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'textField',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              expression: '$F{field}',
              isStretchWithOverflow: true
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);
      
      // Check that the deprecated isStretchWithOverflow attribute is not used, and textAdjust is used instead
      const textFieldElements = doc.querySelectorAll('textField');
      expect(textFieldElements.length).toBeGreaterThan(0);

      // Check that textField does not have the deprecated isStretchWithOverflow attribute
      expect(textFieldElements[0].getAttribute('isStretchWithOverflow')).toBeNull();

      // Check that textField uses the textAdjust attribute
      expect(textFieldElements[0].getAttribute('textAdjust')).toBe('StretchHeight');
    });

    it('should convert the deprecated isSplitAllowed attribute to the splitType attribute', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          isSplitAllowed: false,
          elements: []
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);
      
      // Check that the deprecated isSplitAllowed attribute is not used, and splitType is used instead
      const bandElements = doc.querySelectorAll('band');
      expect(bandElements.length).toBeGreaterThan(0);

      // Check that band does not have the deprecated isSplitAllowed attribute
      expect(bandElements[0].getAttribute('isSplitAllowed')).toBeNull();

      // Check that band uses the splitType attribute
      expect(bandElements[0].getAttribute('splitType')).toBe('Prevent');
    });

    it('should convert the deprecated isStyledText attribute to the markup attribute', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              isStyledText: true
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);
      
      // Check that the deprecated isStyledText attribute is not used, and markup is used instead
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const textElement = staticTextElements[0].querySelector('textElement');
      expect(textElement).toBeDefined();

      // Check that textElement does not have the deprecated isStyledText attribute
      expect(textElement!.getAttribute('isStyledText')).toBeNull();

      // Check that textElement uses the markup attribute
      expect(textElement!.getAttribute('markup')).toBe('styled');
    });

    it('should not generate a box tag when the global border style is empty and no border width is set', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              box: {
                borderStyle: '', // Border style is empty (none)
                borderWidth: 0   // Border width is 0
                // borderColor is intentionally not set, to avoid triggering the hasOldBorderColor check
              }
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);

      // Check that no box tag was generated
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeNull();
    });

    it('should generate a box tag when the global border style is not empty', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              box: {
                borderStyle: 'Solid', // Border style is not empty
                borderWidth: 1,      // Border width is not 0
                borderColor: '#000000'
              }
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);

      // Check that a box tag was generated
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeDefined();

      // Check that the border settings are included
      const penElement = boxElement!.querySelector('pen');
      expect(penElement).toBeDefined();
      expect(penElement!.getAttribute('lineWidth')).toBe('1');
      expect(penElement!.getAttribute('lineStyle')).toBe('Solid');
      expect(penElement!.getAttribute('lineColor')).toBe('#000000');
    });

    it('should generate a box tag when no border style is set but a border width is', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              box: {
                borderWidth: 1,      // Border width is not 0, even without a border style
                borderColor: '#000000'
              }
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);

      // Check that a box tag was generated
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeDefined();

      // Check that the border settings are included
      const penElement = boxElement!.querySelector('pen');
      expect(penElement).toBeDefined();
      expect(penElement!.getAttribute('lineWidth')).toBe('1');
    });

    it('should generate a box tag when only padding is set', () => {
      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };
      
      const bands = [
        {
          type: 'detail',
          height: 50,
          elements: [
            {
              type: 'staticText',
              x: 10,
              y: 10,
              width: 100,
              height: 20,
              text: 'Test Text',
              box: {
                padding: 5  // Only padding is set
              }
            }
          ]
        }
      ];

      const jrxmlContent = generateJRXMLContent(properties, bands, []);
      const doc = parseJRXMLToDOM(jrxmlContent);
      
      // Check that a box tag was generated
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeDefined();

      // Check that the padding settings are included
      expect(boxElement!.getAttribute('padding')).toBe('5');
    });
  });

  describe('Deprecated attribute conversion during JRXML content parsing', () => {
    it('should convert the deprecated border and borderColor attributes to a pen child element', () => {
      const jrxmlWithDeprecatedAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <box border="1" borderColor="#000000"/>
        <textElement/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      const { bands } = parseJRXMLContent(jrxmlWithDeprecatedAttrs);

      // Check that the deprecated attributes were correctly converted in the parse result
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.elements[0].box).toBeDefined();
      expect(detailBand!.elements[0].box.pen).toBeDefined();
      expect(detailBand!.elements[0].box.pen.lineWidth).toBe(1);
      expect(detailBand!.elements[0].box.pen.lineColor).toBe('#000000');
    });

    it('should convert the deprecated isStretchWithOverflow attribute to the textAdjust attribute', () => {
      const jrxmlWithDeprecatedAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50">
      <textField isStretchWithOverflow="true">
        <reportElement x="10" y="10" width="100" height="20"/>
        <textElement/>
        <textFieldExpression><![CDATA[$F{field}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

      const { bands } = parseJRXMLContent(jrxmlWithDeprecatedAttrs);

      // Check that the deprecated attributes were correctly converted in the parse result
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.elements[0].textAdjust).toBe('StretchHeight');
    });

    it('should convert the deprecated isSplitAllowed attribute to the splitType attribute', () => {
      const jrxmlWithDeprecatedAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" isSplitAllowed="false">
    </band>
  </detail>
</jasperReport>`;

      const { bands } = parseJRXMLContent(jrxmlWithDeprecatedAttrs);

      // Check that the deprecated attributes were correctly converted in the parse result
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.splitType).toBe('Prevent');
    });

    it('should convert the deprecated isStyledText attribute to the markup attribute', () => {
      const jrxmlWithDeprecatedAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <textElement isStyledText="true"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      const { bands } = parseJRXMLContent(jrxmlWithDeprecatedAttrs);

      // Check that the deprecated attributes were correctly converted in the parse result
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.elements[0].markup).toBe('styled');
    });
  });

  describe('Round-trip conversion tests', () => {
    it('should correctly handle round-trip conversion of JRXML containing deprecated attributes', () => {
      const originalJrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" isSplitAllowed="false">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <box border="1" borderColor="#000000"/>
        <textElement isStyledText="true"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
      <textField isStretchWithOverflow="true">
        <reportElement x="10" y="40" width="100" height="20"/>
        <textElement/>
        <textFieldExpression><![CDATA[$F{field}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

      // Parse the original JRXML
      const { properties, bands } = parseJRXMLContent(originalJrxml);

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the structure of the regenerated JRXML
      const doc = parseJRXMLToDOM(regeneratedJrxml);

      // Check that band has the correct splitType attribute
      const bandElements = doc.querySelectorAll('band');
      expect(bandElements.length).toBeGreaterThan(0);
      expect(bandElements[0].getAttribute('splitType')).toBe('Prevent');
      expect(bandElements[0].getAttribute('isSplitAllowed')).toBeNull();

      // Check the staticText element
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const staticText = staticTextElements[0];
      const boxElement = staticText.querySelector('box');
      expect(boxElement).toBeDefined();

      const penElement = boxElement!.querySelector('pen');
      expect(penElement).toBeDefined();
      expect(penElement!.getAttribute('lineWidth')).toBe('1');
      expect(penElement!.getAttribute('lineColor')).toBe('#000000');

      const textElement = staticText.querySelector('textElement');
      expect(textElement).toBeDefined();
      expect(textElement!.getAttribute('markup')).toBe('styled');
      expect(textElement!.getAttribute('isStyledText')).toBeNull();

      // Check the textField element
      const textFieldElements = doc.querySelectorAll('textField');
      expect(textFieldElements.length).toBeGreaterThan(0);
      expect(textFieldElements[0].getAttribute('textAdjust')).toBe('StretchHeight');
      expect(textFieldElements[0].getAttribute('isStretchWithOverflow')).toBeNull();

      // Parse the regenerated JRXML again
      const { bands: finalBands } = parseJRXMLContent(regeneratedJrxml);

      // Verify the consistency of the conversion result
      const finalDetailBand = finalBands.find(band => band.type === 'detail');
      expect(finalDetailBand).toBeDefined();
      expect(finalDetailBand!.splitType).toBe('Prevent');
      expect(finalDetailBand!.elements[0].box.pen.lineWidth).toBe(1);
      expect(finalDetailBand!.elements[0].box.pen.lineColor).toBe('#000000');
      expect(finalDetailBand!.elements[0].markup).toBe('styled');
      expect(finalDetailBand!.elements[1].textAdjust).toBe('StretchHeight');
    });

    it('should correctly handle round-trip conversion of a band containing the splitType attribute', () => {
      const originalJrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" splitType="Prevent">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      // Parse the original JRXML
      const { properties, bands } = parseJRXMLContent(originalJrxml);

      // Verify the parse result includes the splitType attribute
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.splitType).toBe('Prevent');

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the regenerated JRXML includes the splitType attribute
      const doc = parseJRXMLToDOM(regeneratedJrxml);
      const bandElements = doc.querySelectorAll('band');
      expect(bandElements.length).toBeGreaterThan(0);
      expect(bandElements[0].getAttribute('splitType')).toBe('Prevent');
      expect(bandElements[0].getAttribute('isSplitAllowed')).toBeNull();

      // Parse the regenerated JRXML again
      const { bands: finalBands } = parseJRXMLContent(regeneratedJrxml);

      // Verify the consistency of the conversion result
      const finalDetailBand = finalBands.find(band => band.type === 'detail');
      expect(finalDetailBand).toBeDefined();
      expect(finalDetailBand!.splitType).toBe('Prevent');
    });

    it('should prefer the splitType attribute over the isSplitAllowed attribute', () => {
      const originalJrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" splitType="Stretch" isSplitAllowed="false">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      // Parse the original JRXML
      const { properties, bands } = parseJRXMLContent(originalJrxml);

      // Verify the parse result prefers the splitType attribute over the isSplitAllowed attribute
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      // Should be "Stretch" rather than "Prevent", since splitType takes priority
      expect(detailBand!.splitType).toBe('Stretch');

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the regenerated JRXML includes splitType="Stretch" and not the deprecated isSplitAllowed attribute
      const doc = parseJRXMLToDOM(regeneratedJrxml);
      const bandElements = doc.querySelectorAll('band');
      expect(bandElements.length).toBeGreaterThan(0);
      expect(bandElements[0].getAttribute('splitType')).toBe('Stretch');
      expect(bandElements[0].getAttribute('isSplitAllowed')).toBeNull();
    });

    test('should prefer non-deprecated attributes over deprecated ones', () => {
      // Create an element that contains both the new attribute and the deprecated attribute
      const elementWithBothProperties = {
        type: 'staticText',
        x: 10,
        y: 10,
        width: 100,
        height: 20,
        text: 'Test Text',
        markup: 'html', // New attribute
        isStyledText: false, // Deprecated attribute
        box: {
          pen: {
            lineWidth: 2,
            lineColor: '#FF0000'
          },
          border: 1, // Deprecated attribute
          borderColor: '#000000' // Deprecated attribute
        }
      };

      const textFieldElement = {
        type: 'textField',
        x: 10,
        y: 40,
        width: 100,
        height: 20,
        expression: '$F{field}',
        textAdjust: 'StretchHeight', // New attribute
        isStretchWithOverflow: false // Deprecated attribute
      };

      const bandWithElement = {
        type: 'detail',
        height: 70,
        splitType: 'Prevent', // New attribute
        isSplitAllowed: true, // Deprecated attribute
        elements: [elementWithBothProperties, textFieldElement]
      };

      const properties = {
        name: 'Test Report',
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 30,
        bottomMargin: 30
      };

      // Generate the JRXML
      const generatedXml = generateJRXMLContent(properties, [bandWithElement], []);
      const doc = parseJRXMLToDOM(generatedXml);

      // Verify the new attributes are preferred over the deprecated ones

      // Check the band attributes
      const bandElements = doc.querySelectorAll('band');
      expect(bandElements.length).toBeGreaterThan(0);
      expect(bandElements[0].getAttribute('splitType')).toBe('Prevent');
      expect(bandElements[0].getAttribute('isSplitAllowed')).toBeNull();

      // Check the staticText element
      const staticTextElements = doc.querySelectorAll('staticText');
      expect(staticTextElements.length).toBeGreaterThan(0);

      const textElement = staticTextElements[0].querySelector('textElement');
      expect(textElement).toBeDefined();
      expect(textElement!.getAttribute('markup')).toBe('html');
      expect(textElement!.getAttribute('isStyledText')).toBeNull();

      const boxElement = staticTextElements[0].querySelector('box');
      expect(boxElement).toBeDefined();

      const penElement = boxElement!.querySelector('pen');
      expect(penElement).toBeDefined();
      expect(penElement!.getAttribute('lineWidth')).toBe('2');
      expect(penElement!.getAttribute('lineColor')).toBe('#FF0000');

      // Check the textField element
      const textFieldElements = doc.querySelectorAll('textField');
      expect(textFieldElements.length).toBeGreaterThan(0);
      expect(textFieldElements[0].getAttribute('textAdjust')).toBe('StretchHeight');
      expect(textFieldElements[0].getAttribute('isStretchWithOverflow')).toBeNull();
    });
  });

  describe('band tag splitType attribute parsing tests', () => {
    it('should correctly parse a band tag containing the splitType attribute', () => {
      const jrxmlWithSplitType = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" splitType="Prevent">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      // Parse the JRXML
      const { properties, bands } = parseJRXMLContent(jrxmlWithSplitType);

      // Verify the parse result includes the splitType attribute
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.splitType).toBe('Prevent');

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the regenerated JRXML includes the splitType attribute
      expect(regeneratedJrxml).toContain('splitType="Prevent"');
      // Verify the regenerated JRXML does not include the deprecated isSplitAllowed attribute
      expect(regeneratedJrxml).not.toContain('isSplitAllowed');
    });

    it('should prefer the splitType attribute over the isSplitAllowed attribute', () => {
      const jrxmlWithBothAttributes = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" splitType="Stretch" isSplitAllowed="false">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      // Parse the JRXML
      const { properties, bands } = parseJRXMLContent(jrxmlWithBothAttributes);

      // Verify the parse result prefers the splitType attribute over the isSplitAllowed attribute
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      // Should be "Stretch" rather than "Prevent", since splitType takes priority
      expect(detailBand!.splitType).toBe('Stretch');

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the regenerated JRXML includes the splitType="Stretch" attribute
      expect(regeneratedJrxml).toContain('splitType="Stretch"');
      // Verify the regenerated JRXML does not include the deprecated isSplitAllowed attribute
      expect(regeneratedJrxml).not.toContain('isSplitAllowed');
    });

    it('should correctly convert the deprecated isSplitAllowed attribute to the splitType attribute', () => {
      const jrxmlWithDeprecatedAttribute = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" name="Test Report" pageWidth="595" pageHeight="842" leftMargin="20" rightMargin="20" topMargin="30" bottomMargin="30">
  <detail>
    <band height="50" isSplitAllowed="false">
      <staticText>
        <reportElement x="10" y="10" width="100" height="20"/>
        <text><![CDATA[Test Text]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      // Parse the JRXML
      const { properties, bands } = parseJRXMLContent(jrxmlWithDeprecatedAttribute);

      // Verify the parse result correctly converted the isSplitAllowed attribute
      const detailBand = bands.find(band => band.type === 'detail');
      expect(detailBand).toBeDefined();
      expect(detailBand!.splitType).toBe('Prevent');

      // Regenerate the JRXML
      const regeneratedJrxml = generateJRXMLContent(properties, bands, []);

      // Verify the regenerated JRXML includes the splitType="Prevent" attribute
      expect(regeneratedJrxml).toContain('splitType="Prevent"');
      // Verify the regenerated JRXML does not include the deprecated isSplitAllowed attribute
      expect(regeneratedJrxml).not.toContain('isSplitAllowed');
    });
  });
});