// Simulate the full structure of a table element dragged in from the element library
// This should match the defaultProps defined in ElementRegistry.ts
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
  // Note: the children here are converted from columns
  children: [
    {
      uuid: 'column1-uuid',
      width: 160,
      name: 'Column1',
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
    },
    {
      uuid: 'column3-uuid',
      width: 215,
      name: 'Column3',
      tableHeader: {
        enable: false,
        element: {
          type: 'staticText',
          x: 0,
          y: 0,
          width: 215,
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
          width: 215,
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
          width: 215,
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
    },
    {
      uuid: 'column3-uuid',
      width: 215,
      name: 'Column3'
    }
  ]
};

// Import the generation function
import { generateJRXMLContent } from '../src/utils/jrxmlGenerator';

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
console.log('=== Test: simulate a table dragged from the element library ===');
console.log('Table element structure:');
console.log('- Type:', mockTableFromLibrary.type);
console.log('- Width:', mockTableFromLibrary.width);
console.log('- Height:', mockTableFromLibrary.height);
console.log('- Dataset:', mockTableFromLibrary.dataset.name);
console.log('- children count:', mockTableFromLibrary.children.length);
console.log('- columns count:', mockTableFromLibrary.columns.length);

// Check the structure of each child column
console.log('\n- Child column details:');
mockTableFromLibrary.children.forEach((column: any, index: number) => {
  console.log(`  Column ${index + 1}:`);
  console.log(`    - Name: ${column.name}`);
  console.log(`    - Width: ${column.width}`);
  console.log(`    - Has tableHeader: ${!!column.tableHeader}`);
  console.log(`    - tableHeader.enable: ${column.tableHeader?.enable}`);
  console.log(`    - Has columnHeader: ${!!column.columnHeader}`);
  console.log(`    - columnHeader.enable: ${column.columnHeader?.enable}`);
  console.log(`    - Has detailCell: ${!!column.detailCell}`);
  console.log(`    - Has children: ${!!column.children}`);
});

const jrxmlContent = generateJRXMLContent(mockProperties, mockBands, mockFields);
console.log('\n\n=== Generated JRXML ===');
console.log(jrxmlContent);

// Check whether the jr:columnHeader tag is included
console.log('\n=== Check result ===');
const columnHeaderCount = (jrxmlContent.match(/<jr:columnHeader/g) || []).length;
if (columnHeaderCount > 0) {
  console.log(`✅ Success: generated ${columnHeaderCount} jr:columnHeader tag(s)`);
} else {
  console.log('❌ Failure: jr:columnHeader tag was not generated');
}

// Check whether every column generated a columnHeader
console.log('\n=== Detailed check ===');
mockTableFromLibrary.children.forEach((column: any, index: number) => {
  const columnName = column.name || `Column${index + 1}`;
  if (jrxmlContent.includes(`value="${columnName}"`)) {
    console.log(`  Column "${columnName}": column definition found`);
    // Check whether this column has a columnHeader
    const columnDefinition = jrxmlContent.split(`<jr:column`).find((part: string) =>
      part.includes(`value="${columnName}"`)
    );
    if (columnDefinition && columnDefinition.includes('<jr:columnHeader')) {
      console.log(`    ✅ Has columnHeader`);
    } else {
      console.log(`    ❌ Missing columnHeader`);
    }
  }
});

// Check for any error messages
console.log('\n=== Error check ===');
if (jrxmlContent.includes('error') || jrxmlContent.includes('Error')) {
  console.log('⚠️  Warning: the JRXML may contain error information');
} else {
  console.log('✅ No error information found');
}
