import { describe, it, expect } from 'vitest'
import { parseJRXMLContent } from './parse'
import fs from 'fs'
import path from 'path'

describe('parseJRXMLContent', () => {
  it('should parse JRXML with componentElement containing table', () => {
    // Use simple JRXML content without namespaces, to make testing easier
    const jrxmlContent = `
      <jasperReport name="test" pageWidth="595" pageHeight="842">
        <detail>
          <band height="200">
            <componentElement>
              <reportElement x="20" y="20" width="555" height="150" uuid="1234-5678-90ab-cdef"/>
              <table>
                <datasetRun subDataset="tableDataset">
                  <datasetParameter name="REPORT_DATA_SOURCE">
                    <datasetParameterExpression>$P{REPORT_DATA_SOURCE}</datasetParameterExpression>
                  </datasetParameter>
                </datasetRun>
                <column width="100">
                  <columnHeader height="30">
                    <staticText>
                      <reportElement x="0" y="0" width="100" height="30"/>
                      <text>Column 1</text>
                    </staticText>
                  </columnHeader>
                  <detailCell height="30">
                    <textField>
                      <reportElement x="0" y="0" width="100" height="30"/>
                      <textFieldExpression>$F{field1}</textFieldExpression>
                    </textField>
                  </detailCell>
                </column>
                <column width="100">
                  <columnHeader height="30">
                    <staticText>
                      <reportElement x="0" y="0" width="100" height="30"/>
                      <text>Column 2</text>
                    </staticText>
                  </columnHeader>
                  <detailCell height="30">
                    <textField>
                      <reportElement x="0" y="0" width="100" height="30"/>
                      <textFieldExpression>$F{field2}</textFieldExpression>
                    </textField>
                  </detailCell>
                </column>
              </table>
            </componentElement>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    // Verify the parse result
    expect(result).toBeDefined()
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].type).toBe('detail')
    expect(result.bands[0].elements).toHaveLength(1)

    // Verify the table element
    const tableElement = result.bands[0].elements[0]
    expect(tableElement.type).toBe('table')
    expect(tableElement.x).toBe(20)
    expect(tableElement.y).toBe(20)
    expect(tableElement.width).toBe(555)
    expect(tableElement.height).toBe(150)
    expect(tableElement.uuid).toBe('1234-5678-90ab-cdef')

    // Verify the table columns
    expect(tableElement.columns).toHaveLength(2)
    expect(tableElement.columns[0].width).toBe(100)
    expect(tableElement.columns[1].width).toBe(100)
    expect(tableElement.columns[0].columnHeader.element.text).toBe('Column 1')
    expect(tableElement.columns[1].columnHeader.element.text).toBe('Column 2')
  })

  it('should parse basic JRXML properties', () => {
    const jrxmlContent = `
      <jasperReport 
        name="TestReport" 
        pageWidth="800" 
        pageHeight="600"
        leftMargin="10"
        rightMargin="10"
        topMargin="15"
        bottomMargin="15"
      >
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.properties).toBeDefined()
    expect(result.properties.name).toBe('TestReport')
    expect(result.properties.pageWidth).toBe(800)
    expect(result.properties.pageHeight).toBe(600)
    expect(result.properties.leftMargin).toBe(10)
    expect(result.properties.rightMargin).toBe(10)
    expect(result.properties.topMargin).toBe(15)
    expect(result.properties.bottomMargin).toBe(15)
  })

  it('should parse JRXML with fields and parameters', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <field name="field1" class="java.lang.String"/>
        <field name="field2" class="java.lang.Integer"/>
        <parameter name="param1" class="java.lang.String">
          <defaultValueExpression>default_value</defaultValueExpression>
        </parameter>
        <parameter name="param2" class="java.util.Date"/>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    // Verify field parsing
    expect(result.fields).toHaveLength(2)
    expect(result.fields[0].name).toBe('field1')
    expect(result.fields[0].class).toBe('java.lang.String')
    expect(result.fields[1].name).toBe('field2')
    expect(result.fields[1].class).toBe('java.lang.Integer')

    // Verify parameter parsing
    expect(result.parameters).toHaveLength(2)
    expect(result.parameters[0].name).toBe('param1')
    expect(result.parameters[0].class).toBe('java.lang.String')
    expect(result.parameters[0].defaultValue).toBe('default_value')
    expect(result.parameters[1].name).toBe('param2')
    expect(result.parameters[1].class).toBe('java.util.Date')
    expect(result.parameters[1].defaultValue).toBeUndefined()
  })

  it('should parse different band types', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <title>
          <band height="50">
          </band>
        </title>
        <pageHeader>
          <band height="40">
          </band>
        </pageHeader>
        <detail>
          <band height="100">
          </band>
        </detail>
        <pageFooter>
          <band height="30">
          </band>
        </pageFooter>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands).toHaveLength(4)
    
    // Verify that all the different band types were parsed
    const bandTypes = result.bands.map(band => band.type)
    expect(bandTypes).toContain('title')
    expect(bandTypes).toContain('pageHeader')
    expect(bandTypes).toContain('detail')
    expect(bandTypes).toContain('pageFooter')

    // Verify band heights
    const titleBand = result.bands.find(band => band.type === 'title')
    expect(titleBand?.height).toBe(50)
    
    const pageHeaderBand = result.bands.find(band => band.type === 'pageHeader')
    expect(pageHeaderBand?.height).toBe(40)
  })

  it('should parse staticText and textField elements', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <staticText>
              <reportElement x="20" y="10" width="100" height="20"/>
              <text>Static Text</text>
            </staticText>
            <textField>
              <reportElement x="20" y="40" width="100" height="20"/>
              <textFieldExpression>$F{field1}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].elements).toHaveLength(2)
    
    // Verify the staticText element
    const staticTextElement = result.bands[0].elements[0]
    expect(staticTextElement.type).toBe('staticText')
    expect(staticTextElement.x).toBe(20)
    expect(staticTextElement.y).toBe(10)
    expect(staticTextElement.width).toBe(100)
    expect(staticTextElement.height).toBe(20)
    expect(staticTextElement.text).toBe('Static Text')

    // Verify the textField element
    const textFieldElement = result.bands[0].elements[1]
    expect(textFieldElement.type).toBe('textField')
    expect(textFieldElement.x).toBe(20)
    expect(textFieldElement.y).toBe(40)
    expect(textFieldElement.width).toBe(100)
    expect(textFieldElement.height).toBe(20)
    expect(textFieldElement.expression).toBe('$F{field1}')
  })

  it('should handle JRXML with missing attributes', () => {
    const jrxmlContent = `
      <jasperReport>
        <detail>
          <band>
          </band>
        </detail>
      </jasperReport>
    `
    
    // Should not throw an error, and should use default values instead
    const result = parseJRXMLContent(jrxmlContent)

    // Verify that default values are used
    expect(result.properties.name).toBe('Unnamed Report')
    expect(result.properties.pageWidth).toBe(595) // Default value
    expect(result.properties.pageHeight).toBe(842) // Default value

    const detailBand = result.bands[0]
    expect(detailBand?.height).toBe(0) // Default height
  })

  it('should parse JRXML with namespace prefixes', () => {
    const jrxmlContent = `
      <jr:jasperReport 
        xmlns:jr="http://jasperreports.sourceforge.net/jasperreports"
        name="TestReport" 
        pageWidth="595" 
        pageHeight="842"
      >
        <jr:detail>
          <jr:band height="100">
            <jr:staticText>
              <jr:reportElement x="20" y="10" width="100" height="20"/>
              <jr:text>Static Text with Namespace</jr:text>
            </jr:staticText>
          </jr:band>
        </jr:detail>
      </jr:jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.properties.name).toBe('TestReport')
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].elements).toHaveLength(1)
    
    const staticTextElement = result.bands[0].elements[0]
    expect(staticTextElement.type).toBe('staticText')
    expect(staticTextElement.text).toBe('Static Text with Namespace')
  })

  it('should handle empty JRXML elements', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <!-- Empty element -->
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result).toBeDefined()
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].elements).toHaveLength(0) // No elements
  })

  it('should parse band with splitType attribute', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100" splitType="Stretch">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].splitType).toBe('Stretch')
  })

  it('should parse subDataset with queryString', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <subDataset name="tableDataset">
          <queryString language="sql">
            SELECT * FROM test_table
          </queryString>
          <field name="field1" class="java.lang.String"/>
          <field name="field2" class="java.lang.Integer"/>
        </subDataset>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].name).toBe('tableDataset')
    expect(result.datasets[0].query).toBeDefined()
    expect(result.datasets[0].query?.language).toBe('sql')
    expect(result.datasets[0].query?.text).toBe('SELECT * FROM test_table')
    expect(result.datasets[0].fields).toHaveLength(2)
  })

  it('should parse subDataset with namespace-prefixed queryString', () => {
    const jrxmlContent = `
      <jr:jasperReport 
        xmlns:jr="http://jasperreports.sourceforge.net/jasperreports"
        name="TestReport" 
        pageWidth="595" 
        pageHeight="842"
      >
        <jr:subDataset name="tableDataset">
          <jr:queryString language="sql">
            SELECT * FROM test_table
          </jr:queryString>
          <jr:field name="field1" class="java.lang.String"/>
        </jr:subDataset>
        <jr:detail>
          <jr:band height="100">
          </jr:band>
        </jr:detail>
      </jr:jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].name).toBe('tableDataset')
    expect(result.datasets[0].query).toBeDefined()
    expect(result.datasets[0].query?.language).toBe('sql')
    expect(result.datasets[0].query?.text).toBe('SELECT * FROM test_table')
  })

  it('should parse main report queryString', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <queryString language="sql">
          SELECT * FROM main_table
        </queryString>
        <field name="field1" class="java.lang.String"/>
        <field name="field2" class="java.lang.Integer"/>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.properties.query).toBeDefined()
    expect(result.properties.query?.language).toBe('sql')
    expect(result.properties.query?.text).toBe('SELECT * FROM main_table')
    expect(result.fields).toHaveLength(2)
  })

  it('should parse main report with namespace-prefixed queryString', () => {
    const jrxmlContent = `
      <jr:jasperReport 
        xmlns:jr="http://jasperreports.sourceforge.net/jasperreports"
        name="TestReport" 
        pageWidth="595" 
        pageHeight="842"
      >
        <jr:queryString language="sql">
          SELECT * FROM main_table
        </jr:queryString>
        <jr:field name="field1" class="java.lang.String"/>
        <jr:detail>
          <jr:band height="100">
          </jr:band>
        </jr:detail>
      </jr:jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.properties.query).toBeDefined()
    expect(result.properties.query?.language).toBe('sql')
    expect(result.properties.query?.text).toBe('SELECT * FROM main_table')
  })

  it('should parse ellipse elements', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <ellipse>
              <reportElement x="20" y="20" width="50" height="50"/>
              <graphicElement>
                <pen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
              </graphicElement>
            </ellipse>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements).toHaveLength(1)
    expect(result.bands[0].elements[0].type).toBe('ellipse')
    expect(result.bands[0].elements[0].x).toBe(20)
    expect(result.bands[0].elements[0].y).toBe(20)
    expect(result.bands[0].elements[0].width).toBe(50)
    expect(result.bands[0].elements[0].height).toBe(50)
  })

  it('should parse break elements', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <break type="Page">
              <reportElement x="20" y="20" width="1" height="1"/>
            </break>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements).toHaveLength(1)
    expect(result.bands[0].elements[0].type).toBe('break')
    expect(result.bands[0].elements[0].breakType).toBe('Page')
  })

  it('should parse frame elements', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <frame>
              <reportElement x="20" y="20" width="200" height="50"/>
              <staticText>
                <reportElement x="10" y="10" width="180" height="30"/>
                <text>Text inside Frame</text>
              </staticText>
            </frame>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements).toHaveLength(1)
    expect(result.bands[0].elements[0].type).toBe('frame')
    expect(result.bands[0].elements[0].x).toBe(20)
    expect(result.bands[0].elements[0].y).toBe(20)
    expect(result.bands[0].elements[0].width).toBe(200)
    expect(result.bands[0].elements[0].height).toBe(50)
  })

  it('should parse text elements with textAlignment and verticalAlignment', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <staticText>
              <reportElement x="20" y="20" width="100" height="30"/>
              <textElement textAlignment="Center" verticalAlignment="Middle">
                <font size="12"/>
              </textElement>
              <text>Centered Text</text>
            </staticText>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].textAlignment).toBe('Center')
    expect(result.bands[0].elements[0].verticalAlignment).toBe('Middle')
  })

  it('should parse text elements with markup', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <staticText>
              <reportElement x="20" y="20" width="100" height="30"/>
              <textElement markup="styled">
                <font size="12"/>
              </textElement>
              <text><![CDATA[<b>Bold Text</b>]]></text>
            </staticText>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].markup).toBe('styled')
  })

  it('should parse textField with evaluationTime', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <textField evaluationTime="Report">
              <reportElement x="20" y="20" width="100" height="30"/>
              <textFieldExpression>$V{REPORT_COUNT}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('textField')
    expect(result.bands[0].elements[0].evaluationTime).toBe('Report')
    expect(result.bands[0].elements[0].expression).toBe('$V{REPORT_COUNT}')
  })

  it('should parse textField with pattern', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <textField pattern="$ #,##0.00">
              <reportElement x="20" y="20" width="100" height="30"/>
              <textFieldExpression>$F{amount}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('textField')
    expect(result.bands[0].elements[0].pattern).toBe('$ #,##0.00')
    expect(result.bands[0].elements[0].expression).toBe('$F{amount}')
  })

  it('should parse subDataset with fields having properties', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <subDataset name="tableDataset">
          <field name="field1" class="java.lang.String">
            <property name="com.jaspersoft.studio.field.label" value="Field 1 Label"/>
            <property name="com.jaspersoft.studio.field.description" value="Field 1 Description"/>
          </field>
        </subDataset>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].fields).toHaveLength(1)
    expect(result.datasets[0].fields[0].properties).toBeDefined()
    expect(result.datasets[0].fields[0].properties?.['com.jaspersoft.studio.field.label']).toBe('Field 1 Label')
    expect(result.datasets[0].fields[0].properties?.['com.jaspersoft.studio.field.description']).toBe('Field 1 Description')
  })

  it('should parse subDataset with parameters', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <subDataset name="tableDataset">
          <parameter name="datasetParam" class="java.lang.String">
            <defaultValueExpression>"default"</defaultValueExpression>
          </parameter>
          <queryString language="sql">
            SELECT * FROM test_table WHERE status = $P{datasetParam}
          </queryString>
        </subDataset>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].parameters).toHaveLength(1)
    expect(result.datasets[0].parameters[0].name).toBe('datasetParam')
    expect(result.datasets[0].parameters[0].class).toBe('java.lang.String')
    expect(result.datasets[0].parameters[0].defaultValue).toBe('"default"')
  })

  it('should parse textField with textAdjust property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <textField textAdjust="StretchHeight">
              <reportElement x="20" y="20" width="100" height="30"/>
              <textFieldExpression>$F{longText}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('textField')
    expect(result.bands[0].elements[0].textAdjust).toBe('StretchHeight')
  })

  it('should parse textField with isStretchWithOverflow property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <textField isStretchWithOverflow="true">
              <reportElement x="20" y="20" width="100" height="30"/>
              <textFieldExpression>$F{longText}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('textField')
    expect(result.bands[0].elements[0].textAdjust).toBe('StretchHeight')
  })

  it('should parse textField with isBlankWhenNull property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <textField isBlankWhenNull="true">
              <reportElement x="20" y="20" width="100" height="30"/>
              <textFieldExpression>$F{nullableField}</textFieldExpression>
            </textField>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('textField')
    expect(result.bands[0].elements[0].isBlankWhenNull).toBe(true)
  })

  it('should parse image with scaleImage property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <image scaleImage="RetainShape">
              <reportElement x="20" y="20" width="100" height="100"/>
              <imageExpression>"/path/to/image.png"</imageExpression>
            </image>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('image')
    expect(result.bands[0].elements[0].scaleImage).toBe('RetainShape')
  })

  it('should parse line with lineDirection property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <line direction="TopDown">
              <reportElement x="20" y="20" width="1" height="60"/>
            </line>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('line')
    expect(result.bands[0].elements[0].lineDirection).toBe('TopDown')
  })

  it('should parse rectangle with fill property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <rectangle>
              <reportElement x="20" y="20" width="100" height="50"/>
              <graphicElement fill="Solid">
                <pen lineWidth="1" lineStyle="Solid" lineColor="#000000"/>
              </graphicElement>
            </rectangle>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('rectangle')
    expect(result.bands[0].elements[0].fill).toBe('Solid')
  })

  it('should parse band with isSplitAllowed property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100" isSplitAllowed="false">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].splitType).toBe('Prevent')
  })

  it('should parse frame with backcolor and mode properties', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <frame>
              <reportElement x="20" y="20" width="200" height="50" backcolor="#FFFF00" mode="Opaque"/>
            </frame>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].type).toBe('frame')
    expect(result.bands[0].elements[0].backcolor).toBe('#FFFF00')
    expect(result.bands[0].elements[0].mode).toBe('Opaque')
  })

  it('should parse textElement with isStyledText property', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <detail>
          <band height="100">
            <staticText>
              <reportElement x="20" y="20" width="100" height="30"/>
              <textElement isStyledText="true">
                <font size="12"/>
              </textElement>
              <text><![CDATA[<b>Bold Text</b>]]></text>
            </staticText>
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.bands[0].elements[0].markup).toBe('styled')
  })

  it('should parse subDataset with properties', () => {
    const jrxmlContent = `
      <jasperReport name="TestReport" pageWidth="595" pageHeight="842">
        <subDataset name="tableDataset">
          <property name="com.jaspersoft.studio.data.defaultdataadapter" value="Sample DB"/>
          <property name="net.sf.jasperreports.query.executer.factory.sql" value="com.jaspersoft.hiberynate.jdbc.HibQueryExecuterFactory"/>
          <queryString language="sql">
            SELECT * FROM test_table
          </queryString>
        </subDataset>
        <detail>
          <band height="100">
          </band>
        </detail>
      </jasperReport>
    `
    
    const result = parseJRXMLContent(jrxmlContent)
    
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].properties).toBeDefined()
    expect(result.datasets[0].properties?.['com.jaspersoft.studio.data.defaultdataadapter']).toBe('Sample DB')
    expect(result.datasets[0].properties?.['net.sf.jasperreports.query.executer.factory.sql']).toBe('com.jaspersoft.hiberynate.jdbc.HibQueryExecuterFactory')
  })

  it('should parse table with 2 head rows correctly', () => {
    // Read the external JRXML file
    const jrxmlFilePath = path.join(__dirname, '../../../tests/table_with_2_head_rows.jrxml')
    const jrxmlContent = fs.readFileSync(jrxmlFilePath, 'utf-8')
    
    const result = parseJRXMLContent(jrxmlContent)
    
    // Verify basic properties
    expect(result.properties.name).toBe('Cherry_Table_Based')
    expect(result.properties.pageWidth).toBe(595)
    expect(result.properties.pageHeight).toBe(842)
    expect(result.properties.whenNoDataType).toBe('AllSectionsNoDetail')

    // Verify subDataset
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].name).toBe('Dataset1')

    // Verify bands
    expect(result.bands).toHaveLength(1)
    expect(result.bands[0].type).toBe('summary')
    expect(result.bands[0].height).toBe(471)
    expect(result.bands[0].splitType).toBe('Stretch')

    // Verify the table element
    expect(result.bands[0].elements).toHaveLength(1)
    const tableElement = result.bands[0].elements[0]
    expect(tableElement.type).toBe('table')
    expect(tableElement.x).toBe(0)
    expect(tableElement.y).toBe(20)
    expect(tableElement.width).toBe(545)
    expect(tableElement.height).toBe(120)

    // Verify the table structure
    expect(tableElement.columns).toBeDefined()
    expect(tableElement.columns).toHaveLength(3) // 2 child columns + 1 regular column

    // Verify the children array includes the columnGroup and the regular column
    expect(tableElement.children).toBeDefined()
    expect(tableElement.children).toHaveLength(2) // 1 columnGroup + 1 regular column

    // Verify the columnGroup
    const columnGroup = tableElement.children[0]
    expect(columnGroup.type).toBe('columnGroup')
    expect(columnGroup.width).toBe(94)
    expect(columnGroup.children).toHaveLength(2) // 2 child columns

    // Verify the columnGroup's table header
    expect(columnGroup.tableHeader).toBeDefined()
    expect(columnGroup.tableHeader.element.height).toBe(30)
    expect(columnGroup.tableHeader.rowSpan).toBe(1)

    // Verify the columnGroup's child columns
    expect(columnGroup.children[0].width).toBe(49)
    expect(columnGroup.children[1].width).toBe(45)

    // Verify the regular column
    const normalColumn = tableElement.children[1]
    expect(normalColumn.type).toBe('column')
    expect(normalColumn.width).toBe(451)

    // Verify the regular column's table header
    expect(normalColumn.tableHeader).toBeDefined()
    expect(normalColumn.tableHeader.element.height).toBe(60)
    expect(normalColumn.tableHeader.rowSpan).toBe(2)
  })

  it('should generate expected TableElement structure from table_with_2_head_rows.jrxml', () => {
    // Read the external JRXML file
    const jrxmlFilePath = path.join(__dirname, '../../../tests/table_with_2_head_rows.jrxml')
    const jrxmlContent = fs.readFileSync(jrxmlFilePath, 'utf-8')
    
    const result = parseJRXMLContent(jrxmlContent)
    
    // Verify the table element
    expect(result.bands[0].elements).toHaveLength(1)
    const tableElement = result.bands[0].elements[0] as any
    expect(tableElement.type).toBe('table')
    expect(tableElement.x).toBe(0)
    expect(tableElement.y).toBe(20)
    expect(tableElement.width).toBe(545)
    expect(tableElement.height).toBe(120)

    // Verify the table's dataset
    expect(tableElement.dataset).toBeDefined()
    expect(tableElement.dataset.name).toBe('Dataset1')
    expect(tableElement.dataset.uuid).toBe('4192004d-c999-41ee-abb5-a49cba17a2f3')

    // Verify the children array (includes the column group and the regular column)
    expect(tableElement.children).toHaveLength(2)
    expect(tableElement.children[0].type).toBe('columnGroup')
    expect(tableElement.children[0].width).toBe(94)
    expect(tableElement.children[0].name).toBe('Columns [2]')
    expect(tableElement.children[0].children).toHaveLength(2)
    expect(tableElement.children[1].type).toBe('column')
    expect(tableElement.children[1].width).toBe(451)

    // Verify the column group's table header
    expect(tableElement.children[0].tableHeader).toBeDefined()
    expect(tableElement.children[0].tableHeader.element.text).toBe('ROW 1+CELL 1')
    expect(tableElement.children[0].tableHeader.element.height).toBe(30)
    expect(tableElement.children[0].tableHeader.rowSpan).toBe(1)

    // Verify the column group's child columns
    expect(tableElement.children[0].children[0].tableHeader).toBeDefined()
    expect(tableElement.children[0].children[0].tableHeader.element.text).toBe('ROW 2 CELL 1')
    expect(tableElement.children[0].children[0].tableHeader.element.height).toBe(30)
    expect(tableElement.children[0].children[0].tableHeader.rowSpan).toBe(1)
    expect(tableElement.children[0].children[0].tableHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[0].children[0].tableHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[0].children[0].tableHeader.element.box).toBeDefined()

    expect(tableElement.children[0].children[1].tableHeader).toBeDefined()
    expect(tableElement.children[0].children[1].tableHeader.element.text).toBe('ROW 2 CELL 2')
    expect(tableElement.children[0].children[1].tableHeader.element.height).toBe(30)
    expect(tableElement.children[0].children[1].tableHeader.rowSpan).toBe(1)
    expect(tableElement.children[0].children[1].tableHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[0].children[1].tableHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[0].children[1].tableHeader.element.box).toBeDefined()

    // Verify the regular column's table header
    expect(tableElement.children[1].tableHeader).toBeDefined()
    expect(tableElement.children[1].tableHeader.element.text).toBe('ROW 1+CELL 2+ROWSPAN2')
    expect(tableElement.children[1].tableHeader.element.height).toBe(60)
    expect(tableElement.children[1].tableHeader.rowSpan).toBe(2)
    expect(tableElement.children[1].tableHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[1].tableHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[1].tableHeader.element.box).toBeDefined()

    // Verify the column header's box element and text alignment settings
    expect(tableElement.children[0].children[0].columnHeader).toBeDefined()
    expect(tableElement.children[0].children[0].columnHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[0].children[0].columnHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[0].children[0].columnHeader.element.box).toBeDefined()

    expect(tableElement.children[0].children[1].columnHeader).toBeDefined()
    expect(tableElement.children[0].children[1].columnHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[0].children[1].columnHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[0].children[1].columnHeader.element.box).toBeDefined()

    expect(tableElement.children[1].columnHeader).toBeDefined()
    expect(tableElement.children[1].columnHeader.element.textAlignment).toBe('Center')
    expect(tableElement.children[1].columnHeader.element.verticalAlignment).toBe('Middle')
    expect(tableElement.children[1].columnHeader.element.box).toBeDefined()
    
    // Derive the header row structure after column combination
    // Helper function: recursively compute the actual column count of a column or column group
    const calculateColumnsCount = (item: any): number => {
      if (item.type === 'column') {
        return 1;
      } else if (item.type === 'columnGroup') {
        return item.children.reduce((sum: number, child: any) => sum + calculateColumnsCount(child), 0);
      }
      return 0;
    };

    // Helper function: recursively build the header structure
    const buildHeaderStructure = (items: any[], headerLevel: 'tableHeader' | 'columnHeader'): any[] => {
      const result: any[] = [];

      items.forEach(item => {
        if (item.type === 'column') {
          // Regular column, add the cell directly
          if (item[headerLevel]) {
            result.push({
              content: item[headerLevel].element?.text || item[headerLevel].element?.expression,
              rowSpan: item[headerLevel].rowSpan,
              colSpan: 1,
              width: item.width,
              height: item[headerLevel].element?.height
            });
          }
        } else if (item.type === 'columnGroup') {
          // Column group, compute its colspan
          const colSpan = calculateColumnsCount(item);
          if (item[headerLevel]) {
            result.push({
              content: item[headerLevel].element?.text || item[headerLevel].element?.expression,
              rowSpan: item[headerLevel].rowSpan,
              colSpan: colSpan,
              width: item.width,
              height: item[headerLevel].element?.height
            });
          } else {
            // If the column group has no header at this level, recursively process its children
            const childHeaders = buildHeaderStructure(item.children, headerLevel);
            result.push(...childHeaders);
          }
        }
      });

      return result;
    };

    // Build the table header (the first-level header)
    const tableHeaders = buildHeaderStructure(tableElement.children, 'tableHeader');
    expect(tableHeaders).toHaveLength(2);
    expect(tableHeaders[0].content).toBe('ROW 1+CELL 1');
    expect(tableHeaders[0].rowSpan).toBe(1);
    expect(tableHeaders[0].colSpan).toBe(2); // Spans 2 columns
    expect(tableHeaders[0].width).toBe(94);

    expect(tableHeaders[1].content).toBe('ROW 1+CELL 2+ROWSPAN2');
    expect(tableHeaders[1].rowSpan).toBe(2); // Spans 2 rows
    expect(tableHeaders[1].colSpan).toBe(1);
    expect(tableHeaders[1].width).toBe(451);

    // Build the column header (the second-level header)
    const columnHeaders = buildHeaderStructure(tableElement.children, 'columnHeader');
    expect(columnHeaders).toHaveLength(3);
    // The column header consists of the column group's child columns and the regular column
    expect(columnHeaders[0].content).toBe('"Text Field"');
    expect(columnHeaders[0].rowSpan).toBe(1);
    expect(columnHeaders[0].colSpan).toBe(1);
    
    expect(columnHeaders[1].content).toBe('"Text Field"');
    expect(columnHeaders[1].rowSpan).toBe(1);
    expect(columnHeaders[1].colSpan).toBe(1);
    
    expect(columnHeaders[2].content).toBe('"Text Field"');
    expect(columnHeaders[2].rowSpan).toBe(1);
    expect(columnHeaders[2].colSpan).toBe(1);
    
    // Compute the total number of header rows (based on the maximum rowSpan value)
    const calculateTotalHeaderRows = () => {
      let maxRowSpan = 0;

      // Recursively check the rowSpan of every header
      const checkRowSpan = (items: any[]) => {
        items.forEach(item => {
          if (item.type === 'column') {
            if (item.tableHeader) {
              maxRowSpan = Math.max(maxRowSpan, item.tableHeader.rowSpan);
            }
          } else if (item.type === 'columnGroup') {
            if (item.tableHeader) {
              maxRowSpan = Math.max(maxRowSpan, item.tableHeader.rowSpan);
            }
            checkRowSpan(item.children);
          }
        });
      };
      
      checkRowSpan(tableElement.children);
      return maxRowSpan;
    };
    
    const totalHeaderRows = calculateTotalHeaderRows();
    expect(totalHeaderRows).toBe(2); // The maximum rowSpan is 2, so the header has 2 rows total

    // Build the final header row structure (organized by row)
    const buildHeaderRows = () => {
      const rows: any[][] = [];
      const totalRows = calculateTotalHeaderRows();

      // Initialize the row arrays
      for (let i = 0; i < totalRows; i++) {
        rows[i] = [];
      }

      // Recursively populate the row structure
      const fillRows = (items: any[], startRow: number) => {
        items.forEach(item => {
          if (item.type === 'column') {
            // Regular column, populate its tableHeader (if present)
            if (item.tableHeader) {
              const { rowSpan, element } = item.tableHeader;
              const cell = {
                content: element?.text || element?.expression,
                rowSpan: rowSpan,
                colSpan: 1,
                width: item.width,
                height: element?.height
              };

              // Add the cell to the starting row
              rows[startRow].push(cell);
            }
          } else if (item.type === 'columnGroup') {
            // Column group
            if (item.tableHeader) {
              const { rowSpan, element } = item.tableHeader;
              const colSpan = calculateColumnsCount(item);
              const cell = {
                content: element?.text || element?.expression,
                rowSpan: rowSpan,
                colSpan: colSpan,
                width: item.width,
                height: element?.height
              };

              // Add the cell to the starting row
              rows[startRow].push(cell);
            }

            // Regardless of whether the column group has a tableHeader, its children's headers still need processing
            // For the second row, we need to process the children directly
            if (startRow < totalRows - 1) {
              fillRows(item.children, startRow + 1);
            }
          }
        });
      };

      // Populate the first-level header (tableHeader)
      fillRows(tableElement.children, 0);

      return rows;
    };

    // Build the column header row structure
    const buildColumnHeaderRow = () => {
      return buildHeaderStructure(tableElement.children, 'columnHeader');
    };

    const headerRows = buildHeaderRows();
    const columnHeaderRow = buildColumnHeaderRow();

    // Verify the header row structure (compared against the JasperReports Studio preview)
    expect(headerRows).toHaveLength(2);

    // The first header row (corresponds to the first row in the preview)
    expect(headerRows[0]).toHaveLength(2);
    expect(headerRows[0][0].content).toBe('ROW 1+CELL 1');
    expect(headerRows[0][0].rowSpan).toBe(1);
    expect(headerRows[0][0].colSpan).toBe(2); // Spans 2 columns
    expect(headerRows[0][1].content).toBe('ROW 1+CELL 2+ROWSPAN2');
    expect(headerRows[0][1].rowSpan).toBe(2); // Spans 2 rows
    expect(headerRows[0][1].colSpan).toBe(1);

    // The second header row (corresponds to the second row in the preview)
    expect(headerRows[1]).toHaveLength(2);
    expect(headerRows[1][0].content).toBe('ROW 2 CELL 1');
    expect(headerRows[1][0].rowSpan).toBe(1);
    expect(headerRows[1][0].colSpan).toBe(1);
    expect(headerRows[1][1].content).toBe('ROW 2 CELL 2');
    expect(headerRows[1][1].rowSpan).toBe(1);
    expect(headerRows[1][1].colSpan).toBe(1);

    // The column header row (corresponds to the third row in the preview)
    expect(columnHeaderRow).toHaveLength(3);
    expect(columnHeaderRow[0].content).toBe('"Text Field"');
    expect(columnHeaderRow[0].rowSpan).toBe(1);
    expect(columnHeaderRow[0].colSpan).toBe(1);
    expect(columnHeaderRow[1].content).toBe('"Text Field"');
    expect(columnHeaderRow[1].rowSpan).toBe(1);
    expect(columnHeaderRow[1].colSpan).toBe(1);
    expect(columnHeaderRow[2].content).toBe('"Text Field"');
    expect(columnHeaderRow[2].rowSpan).toBe(1);
    expect(columnHeaderRow[2].colSpan).toBe(1);

    // Verify the overall table structure matches the preview
    // Row 1: ROW 1+CELL 1 (colSpan=2) | ROW 1+CELL 2+ROWSPAN2 (rowSpan=2)
    // Row 2: ROW 2 CELL 1 | ROW 2 CELL 2 | (blank, covered by the cell spanning down from above)
    // Row 3: Text Field | Text Field | Text Field
  })

  
})

