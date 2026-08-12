// Test whether jr:columnHeader tags are generated when a table element is dragged into the design area
import { describe, it, expect } from 'vitest';
import { generateJRXMLContent } from '../src/utils/jrxmlGenerator';

describe('Table Column Header Generation', () => {
  it('should generate jr:columnHeader when table is dragged to design area', () => {
    // Simulate a table element dragged into the design area
    const mockTableElement = {
      type: 'table',
      x: 0,
      y: 0,
      width: 555,
      height: 200,
      dataset: {
        uuid: 'test-dataset-uuid',
        name: 'tableDataset'
      },
      columns: [
        {
          uuid: 'test-column-1',
          width: 160,
          name: 'Column1',
          hasTableHeader: false,
          tableHeader: {
            enable: false,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              text: 'Header',
              forecolor: '#000000',
              backcolor: '#FFFFFF',
              fontFamily: 'SansSerif',
              fontSize: 19,
              isBold: true,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          columnHeader: {
            enable: true,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              text: 'Column Header',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          detailCell: {
            enable: true,
            element: {
              type: 'textField',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              expression: '$F{FIELD_NAME}',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          }
        }
      ],
      children: [] // no grouped columns
    };

    // Simulate report properties
    const mockProperties = {
      name: 'TestReport',
      pageWidth: 595,
      pageHeight: 842,
      leftMargin: 20,
      rightMargin: 20,
      topMargin: 20,
      bottomMargin: 20,
      columnWidth: 555,
      columnCount: 1,
      printOrder: 'Vertical',
      whenNoDataType: 'AllSectionsNoDetail',
      isTitleNewPage: false,
      isSummaryNewPage: false
    };

    // Simulate bands
    const mockBands = [
      {
        type: 'detail',
        height: 200,
        elements: [mockTableElement]
      }
    ];

    // Simulate fields
    const mockFields = [
      {
        name: 'FIELD_NAME',
        class: 'java.lang.String'
      }
    ];

    // Generate JRXML
    const jrxmlContent = generateJRXMLContent(mockProperties, mockBands, mockFields);

    // Print the generated JRXML
    console.log('Generated JRXML:');
    console.log(jrxmlContent);

    // Check whether the jr:columnHeader tag is included
    expect(jrxmlContent).toContain('<jr:columnHeader');
    console.log('✅ SUCCESS: Table column header is generated correctly');
  });

  it('should generate jr:columnHeader for tables with children array (like dragged from library)', () => {
    // Simulate a table element dragged in from the element library, with a full children structure
    const mockTableFromLibrary = {
      type: 'table',
      x: 0,
      y: 0,
      width: 555,
      height: 200,
      dataset: {
        uuid: 'test-dataset-uuid',
        name: 'tableDataset'
      },
      // A table dragged from the element library may have both children and columns properties
      children: [
        {
          uuid: 'column1-uuid',
          width: 160,
          name: 'Column1',
          hasTableHeader: false,
          tableHeader: {
            enable: false,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              text: 'Header',
              forecolor: '#000000',
              backcolor: '#FFFFFF',
              fontFamily: 'SansSerif',
              fontSize: 19,
              isBold: true,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          columnHeader: {
            enable: true,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              text: 'Column Header',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          detailCell: {
            enable: true,
            element: {
              type: 'textField',
              x: 0,
              y: 0,
              width: 160,
              height: 30,
              expression: '$F{FIELD_NAME}',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          }
        },
        {
          uuid: 'column2-uuid',
          width: 180,
          name: 'Column2',
          hasTableHeader: false,
          tableHeader: {
            enable: false,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 180,
              height: 30,
              text: '',
              forecolor: '#000000',
              backcolor: '#FFFFFF',
              fontFamily: 'SansSerif',
              fontSize: 19,
              isBold: true,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          columnHeader: {
            enable: true,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: 180,
              height: 30,
              text: 'Column Header',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          detailCell: {
            enable: true,
            element: {
              type: 'textField',
              x: 0,
              y: 0,
              width: 180,
              height: 30,
              expression: '$F{FIELD_NAME}',
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          }
        }
      ],
      // The original columns property is also retained
      columns: [
        {
          uuid: 'column1-uuid',
          width: 160,
          name: 'Column1'
        },
        {
          uuid: 'column2-uuid',
          width: 180,
          name: 'Column2'
        }
      ]
    };

    // Simulate report properties
    const mockProperties = {
      name: 'TestReport',
      pageWidth: 595,
      pageHeight: 842,
      leftMargin: 20,
      rightMargin: 20,
      topMargin: 20,
      bottomMargin: 20,
      columnWidth: 555,
      columnCount: 1,
      printOrder: 'Vertical',
      whenNoDataType: 'AllSectionsNoDetail',
      isTitleNewPage: false,
      isSummaryNewPage: false
    };

    // Simulate bands
    const mockBands = [
      {
        type: 'detail',
        height: 200,
        elements: [mockTableFromLibrary]
      }
    ];

    // Simulate fields
    const mockFields = [
      {
        name: 'FIELD_NAME',
        class: 'java.lang.String'
      }
    ];

    // Generate JRXML
    console.log('\n=== Test: table dragged from the element library (has both children and columns properties) ===');
    console.log('Table element structure:');
    console.log('- children count:', mockTableFromLibrary.children.length);
    console.log('- columns count:', mockTableFromLibrary.columns.length);

    const jrxmlContent = generateJRXMLContent(mockProperties, mockBands, mockFields);
    console.log('\nGenerated JRXML:');
    console.log(jrxmlContent);

    // Check whether the jr:columnHeader tag is included
    const columnHeaderCount = (jrxmlContent.match(/<jr:columnHeader/g) || []).length;
    console.log('\n=== Check result ===');
    console.log(`Generated ${columnHeaderCount} jr:columnHeader tag(s)`);

    expect(jrxmlContent).toContain('<jr:columnHeader');
    console.log('✅ SUCCESS: Table column headers are generated correctly for library-dragged table');
  });
});
