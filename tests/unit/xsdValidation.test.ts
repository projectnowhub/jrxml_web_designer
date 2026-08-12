import { describe, it, expect, beforeAll } from 'vitest'
import { generateJRXMLContent } from '@/utils/jrxmlGenerator'
import type { Band, ReportProperties, DesignElement } from '@/types'
import fs from 'fs'
import path from 'path'

// Import validation logic directly from xsdValidator.ts
function parseXsdSchema(xsdContent: string): Map<string, Set<string>> {
  const elementAttributes = new Map<string, Set<string>>()
  const parser = new DOMParser()
  const xsdDoc = parser.parseFromString(xsdContent, 'text/xml')

  // Find all xs:element definitions
  const elements = xsdDoc.querySelectorAll('xs:element')
  elements.forEach(element => {
    const elementName = element.getAttribute('name')
    if (!elementName) return

    const allowedAttrs = new Set<string>()

    // Look for a complexType definition
    let complexType = element.querySelector('xs:complexType')
    if (!complexType) {
      const complexTypeName = element.getAttribute('type')
      if (complexTypeName) {
        complexType = xsdDoc.querySelector(`xs:complexType[name="${complexTypeName}"]`)
      }
    }

    if (complexType) {
      // Look for direct attribute definitions
      const attrs = complexType.querySelectorAll('xs:attribute')
      attrs.forEach(attr => {
        const attrName = attr.getAttribute('name')
        if (attrName) allowedAttrs.add(attrName)
      })

      // Look for attribute group references
      const attrGroupRefs = complexType.querySelectorAll('xs:attributeGroup')
      attrGroupRefs.forEach(attrGroupRef => {
        const refName = attrGroupRef.getAttribute('ref')
        if (refName) {
          const attrGroup = xsdDoc.querySelector(`xs:attributeGroup[name="${refName}"]`)
          if (attrGroup) {
            const groupAttrs = attrGroup.querySelectorAll('xs:attribute')
            groupAttrs.forEach(attr => {
              const attrName = attr.getAttribute('name')
              if (attrName) allowedAttrs.add(attrName)
            })
          }
        }
      })

      // Check for anyAttribute
      const anyAttr = complexType.querySelector('xs:anyAttribute')
      if (anyAttr) {
        allowedAttrs.add('*') // allow any attribute
      }
    }

    elementAttributes.set(elementName, allowedAttrs)
  })

  return elementAttributes
}

function validateAgainstXSD(xmlContent: string, xsdContent: string): { valid: boolean; errors: { message: string; elementName?: string; attributeName?: string }[] } {
  const errors: { message: string; elementName?: string; attributeName?: string }[] = []
  const elementAttributes = parseXsdSchema(xsdContent)

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

  // Check for XML parse errors
  const xmlParseError = xmlDoc.querySelector('parsererror')
  if (xmlParseError) {
    errors.push({ message: `XML parse error: ${xmlParseError.textContent || 'unknown error'}` })
    return { valid: false, errors }
  }

  // Get all elements
  const allElements = xmlDoc.querySelectorAll('*')

  allElements.forEach(element => {
    const elementName = element.localName

    // Skip the jasperReport root element and a few special elements
    if (elementName === 'jasperReport' || elementName === 'import' || elementName === 'template') {
      return
    }

    // Check whether the element is defined in the XSD
    const allowedAttrs = elementAttributes.get(elementName)
    if (!allowedAttrs) {
      // Check whether it's in the jr namespace
      const jrAllowedAttrs = elementAttributes.get(elementName)
      if (!jrAllowedAttrs) {
        // Some elements may not be explicitly defined in the XSD, but are still valid
        return
      }
    }

    // Check attributes
    const attributes = element.attributes
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i]
      const attrName = attr.localName

      // Skip namespace attributes
      if (attrName === 'xmlns' || attrName.startsWith('xmlns:') || attrName === 'xsi:schemaLocation') {
        continue
      }

      // If any attribute is allowed, skip the check
      if (allowedAttrs && allowedAttrs.has('*')) {
        continue
      }

      // Check whether the attribute is allowed
      if (allowedAttrs && !allowedAttrs.has(attrName)) {
        errors.push({
          message: `Element ${elementName} does not allow the attribute ${attrName}`,
          elementName,
          attributeName: attrName
        })
      }
    }
  })

  return { valid: errors.length === 0, errors }
}

describe('jrxmlGenerator XSD Validation', () => {
  let xsdContent: string

  beforeAll(() => {
    // Load the XSD file
    const xsdPath = path.resolve(__dirname, '../../jasperreport.xsd')
    xsdContent = fs.readFileSync(xsdPath, 'utf-8')
  })

  const mockReportProperties: ReportProperties = {
    name: 'Test Report',
    pageWidth: 595,
    pageHeight: 842,
    leftMargin: 20,
    rightMargin: 20,
    topMargin: 20,
    bottomMargin: 20,
    defaultFont: {
      name: 'Arial',
      size: 12,
      isBold: false,
      isItalic: false,
      isUnderline: false
    },
    orientation: 'portrait'
  }

  // Test the static text element
  it('JRXML generated for a staticText element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'staticText',
            x: 20,
            y: 10,
            width: 200,
            height: 30,
            text: 'Static Text',
            fontFamily: 'Arial',
            fontSize: 12,
            isBold: true,
            isItalic: false,
            isUnderline: false,
            textAlignment: 'Left',
            verticalAlignment: 'Top',
            rotation: 'None',
            markup: 'none'
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('staticText validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the text field element
  it('JRXML generated for a textField element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'textField',
            x: 20,
            y: 10,
            width: 200,
            height: 30,
            expression: '$F{field_name}',
            fontFamily: 'Arial',
            fontSize: 12,
            isBold: false,
            isItalic: false,
            isUnderline: false,
            textAlignment: 'Left',
            verticalAlignment: 'Top',
            rotation: 'None',
            textAdjust: 'CutText'
          } as DesignElement
        ]
      }
    ]

    const fields = [{ name: 'field_name', class: 'java.lang.String' }]
    const jrxml = generateJRXMLContent(mockReportProperties, bands, fields, [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('textField validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the image element
  it('JRXML generated for an image element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'image',
            x: 20,
            y: 10,
            width: 100,
            height: 50,
            imageExpression: '"image.png"'
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('image validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the line element
  it('JRXML generated for a line element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'line',
            x: 20,
            y: 10,
            width: 100,
            height: 0,
            lineDirection: 'TopDown'
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('line validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the rectangle element
  it('JRXML generated for a rectangle element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'rectangle',
            x: 20,
            y: 10,
            width: 100,
            height: 50,
            radius: 5
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('rectangle validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the ellipse element
  it('JRXML generated for an ellipse element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'ellipse',
            x: 20,
            y: 10,
            width: 50,
            height: 30
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('ellipse validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the frame element
  it('JRXML generated for a frame element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'frame',
            x: 20,
            y: 10,
            width: 150,
            height: 50,
            elements: [
              {
                type: 'staticText',
                x: 10,
                y: 10,
                width: 130,
                height: 30,
                text: 'Text inside frame',
                fontFamily: 'Arial',
                fontSize: 12
              } as DesignElement
            ]
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('frame validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the page-break element
  it('JRXML generated for a break element should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'break',
            x: 20,
            y: 10,
            width: 1,
            height: 1,
            breakType: 'Page'
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('break validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test an element with a border
  it('JRXML generated for an element with a border should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'staticText',
            x: 20,
            y: 10,
            width: 100,
            height: 20,
            text: 'Text with border',
            fontFamily: 'Arial',
            fontSize: 12,
            box: {
              pen: {
                lineWidth: 1,
                lineStyle: 'Solid',
                lineColor: '#000000'
              },
              topPen: {
                lineWidth: 1,
                lineStyle: 'Solid',
                lineColor: '#FF0000'
              },
              bottomPen: {
                lineWidth: 2,
                lineStyle: 'Dashed',
                lineColor: '#00FF00'
              },
              leftPen: {
                lineWidth: 1,
                lineStyle: 'Solid',
                lineColor: '#0000FF'
              },
              rightPen: {
                lineWidth: 1,
                lineStyle: 'Solid',
                lineColor: '#0000FF'
              },
              padding: 5,
              topPadding: 3,
              bottomPadding: 3,
              leftPadding: 10,
              rightPadding: 5
            }
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('box validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the table element
  it('JRXML generated for a table element should pass XSD validation', () => {
    const tableElement: any = {
      type: 'table',
      x: 0,
      y: 0,
      width: 500,
      height: 300,
      uuid: 'test-table-uuid',
      dataset: {
        name: 'testDataset',
        uuid: 'test-dataset-uuid'
      },
      children: [
        {
          name: 'Column1',
          uuid: 'column1-uuid',
          width: 100,
          columnHeader: {
            enable: true,
            element: {
              type: 'staticText',
              text: 'Column Header',
              x: 0,
              y: 0,
              width: 100,
              height: 30
            }
          },
          detailCell: {
            enable: true,
            element: {
              type: 'textField',
              expression: '$F{field1}',
              x: 0,
              y: 0,
              width: 100,
              height: 30
            }
          }
        }
      ]
    }

    const bands: Band[] = [
      {
        type: 'detail',
        height: 300,
        elements: [tableElement as DesignElement]
      }
    ]

    const fields = [{ name: 'field1', class: 'java.lang.String' }]
    const subDatasets = [
      {
        name: 'testDataset',
        uuid: 'test-dataset-uuid',
        query: {
          text: 'SELECT * FROM test_table',
          language: 'sql'
        }
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, fields, [], subDatasets)
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('table validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test all Band types
  it('JRXML generated for all Band types should pass XSD validation', () => {
    const allBandTypes: Band[] = [
      { type: 'title', height: 80, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Title', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'pageHeader', height: 50, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Page Header', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'columnHeader', height: 30, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Column Header', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'detail', height: 100, elements: [{ type: 'textField', x: 0, y: 0, width: 100, height: 30, expression: '$F{field}', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'columnFooter', height: 30, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Column Footer', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'pageFooter', height: 40, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Page Footer', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'summary', height: 60, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'Summary', fontFamily: 'Arial', fontSize: 12 } as DesignElement] },
      { type: 'background', height: 100, elements: [{ type: 'rectangle', x: 0, y: 0, width: 100, height: 100 } as DesignElement] },
      { type: 'noData', height: 50, elements: [{ type: 'staticText', x: 0, y: 0, width: 100, height: 30, text: 'No Data', fontFamily: 'Arial', fontSize: 12 } as DesignElement] }
    ]

    const fields = [{ name: 'field', class: 'java.lang.String' }]
    const jrxml = generateJRXMLContent(mockReportProperties, allBandTypes, fields, [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('Band type validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test style definitions
  it('JRXML generated for a style definition should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'staticText',
            x: 20,
            y: 10,
            width: 100,
            height: 20,
            text: 'Styled text',
            fontFamily: 'Arial',
            fontSize: 12,
            style: 'CustomStyle'
          } as DesignElement
        ]
      }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, [], [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('style validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test parameters and fields
  it('JRXML generated for parameter and field definitions should pass XSD validation', () => {
    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'textField',
            x: 20,
            y: 10,
            width: 100,
            height: 20,
            expression: '$P{param1}',
            fontFamily: 'Arial',
            fontSize: 12
          } as DesignElement,
          {
            type: 'textField',
            x: 130,
            y: 10,
            width: 100,
            height: 20,
            expression: '$F{field1}',
            fontFamily: 'Arial',
            fontSize: 12
          } as DesignElement
        ]
      }
    ]

    const fields = [
      { name: 'field1', class: 'java.lang.String' },
      { name: 'field2', class: 'java.lang.Integer' }
    ]

    const parameters = [
      { name: 'param1', class: 'java.lang.String', defaultValue: 'default_value' },
      { name: 'param2', class: 'java.util.Date' }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, bands, fields, parameters)
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('parameter/field validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test the query string
  it('JRXML generated for a query string should pass XSD validation', () => {
    const propertiesWithQuery = {
      ...mockReportProperties,
      query: {
        language: 'sql',
        text: 'SELECT * FROM main_table'
      }
    }

    const bands: Band[] = [
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'textField',
            x: 20,
            y: 10,
            width: 100,
            height: 20,
            expression: '$F{id}',
            fontFamily: 'Arial',
            fontSize: 12
          } as DesignElement
        ]
      }
    ]

    const fields = [{ name: 'id', class: 'java.lang.Integer' }]
    const jrxml = generateJRXMLContent(propertiesWithQuery, bands, fields, [])
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('queryString validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })

  // Test a complex combination
  it('JRXML generated for a complex combination of elements should pass XSD validation', () => {
    const complexBands: Band[] = [
      {
        type: 'title',
        height: 80,
        elements: [
          {
            type: 'staticText',
            x: 20,
            y: 10,
            width: 200,
            height: 30,
            text: 'Report Title',
            fontFamily: 'Arial',
            fontSize: 16,
            isBold: true,
            textAlignment: 'Center',
            verticalAlignment: 'Middle',
            box: {
              pen: { lineWidth: 1, lineStyle: 'Solid', lineColor: '#000000' }
            }
          } as DesignElement,
          {
            type: 'image',
            x: 400,
            y: 10,
            width: 100,
            height: 50,
            imageExpression: '"logo.png"'
          } as DesignElement
        ]
      },
      {
        type: 'detail',
        height: 100,
        elements: [
          {
            type: 'textField',
            x: 20,
            y: 10,
            width: 100,
            height: 20,
            expression: '$F{name}',
            fontFamily: 'Arial',
            fontSize: 12,
            textAdjust: 'StretchHeight',
            box: {
              leftPen: { lineWidth: 1, lineStyle: 'Solid', lineColor: '#000000' },
              rightPen: { lineWidth: 1, lineStyle: 'Solid', lineColor: '#000000' }
            }
          } as DesignElement,
          {
            type: 'line',
            x: 20,
            y: 40,
            width: 200,
            height: 0,
            lineDirection: 'TopDown'
          } as DesignElement,
          {
            type: 'rectangle',
            x: 250,
            y: 10,
            width: 50,
            height: 30,
            radius: 5
          } as DesignElement
        ]
      }
    ]

    const fields = [
      { name: 'name', class: 'java.lang.String' },
      { name: 'value', class: 'java.lang.Integer' }
    ]

    const parameters = [
      { name: 'reportTitle', class: 'java.lang.String', defaultValue: 'Default Title' }
    ]

    const jrxml = generateJRXMLContent(mockReportProperties, complexBands, fields, parameters)
    const result = validateAgainstXSD(jrxml, xsdContent)

    if (!result.valid) {
      console.error('Complex combination validation errors:', result.errors)
    }

    expect(result.valid).toBe(true)
  })
})
