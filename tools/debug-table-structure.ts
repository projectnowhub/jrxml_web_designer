import { generateJRXMLContent } from '../src/utils/jrxmlGenerator';

// Simulate a table element dragged in from the element library
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
  // Note: only the columns property is set here, no children property
  columns: [
    {
      uuid: 'test-column-1',
      width: 160,
      name: 'Column1',
      tableHeader: {
        enable: false,
        element: {
          type: 'staticText',
          text: 'Header',
          x: 0,
          y: 0,
          width: 160,
          height: 30
        }
      },
      columnHeader: {
        enable: true,
        element: {
          type: 'staticText',
          text: 'Column Header',
          x: 0,
          y: 0,
          width: 160,
          height: 30
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
console.log('=== Test 1: table with only the columns property ===');
console.log('Table element structure:', JSON.stringify(mockTableElement, null, 2));

const jrxmlContent1 = generateJRXMLContent(mockProperties, mockBands, mockFields);
console.log('\nGenerated JRXML:');
console.log(jrxmlContent1);

// Check whether the jr:columnHeader tag is included
console.log('\n=== Check result ===');
if (jrxmlContent1.includes('<jr:columnHeader')) {
  console.log('✅ Success: jr:columnHeader tag was generated');
} else {
  console.log('❌ Failure: jr:columnHeader tag was not generated');
}

// Test 2: add an empty children property
const mockTableElementWithEmptyChildren = {
  ...mockTableElement,
  children: [] // empty children array
};

console.log('\n\n=== Test 2: table with columns property and an empty children property ===');
console.log('Table element structure:', JSON.stringify(mockTableElementWithEmptyChildren, null, 2));

const jrxmlContent2 = generateJRXMLContent(mockProperties, [
  {
    type: 'detail',
    height: 200,
    elements: [mockTableElementWithEmptyChildren]
  }
], mockFields);

console.log('\nGenerated JRXML:');
console.log(jrxmlContent2);

// Check whether the jr:columnHeader tag is included
console.log('\n=== Check result ===');
if (jrxmlContent2.includes('<jr:columnHeader')) {
  console.log('✅ Success: jr:columnHeader tag was generated');
} else {
  console.log('❌ Failure: jr:columnHeader tag was not generated');
}

// Test 3: table with a children property but no column groups
const mockTableElementWithChildren = {
  ...mockTableElement,
  children: [
    {
      uuid: 'test-column-1',
      width: 160,
      name: 'Column1',
      tableHeader: {
        enable: false,
        element: {
          type: 'staticText',
          text: 'Header',
          x: 0,
          y: 0,
          width: 160,
          height: 30
        }
      },
      columnHeader: {
        enable: true,
        element: {
          type: 'staticText',
          text: 'Column Header',
          x: 0,
          y: 0,
          width: 160,
          height: 30
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
  ]
};

console.log('\n\n=== Test 3: table with a children property but no column groups ===');
console.log('Table element structure:', JSON.stringify(mockTableElementWithChildren, null, 2));

const jrxmlContent3 = generateJRXMLContent(mockProperties, [
  {
    type: 'detail',
    height: 200,
    elements: [mockTableElementWithChildren]
  }
], mockFields);

console.log('\nGenerated JRXML:');
console.log(jrxmlContent3);

// Check whether the jr:columnHeader tag is included
console.log('\n=== Check result ===');
if (jrxmlContent3.includes('<jr:columnHeader')) {
  console.log('✅ Success: jr:columnHeader tag was generated');
} else {
  console.log('❌ Failure: jr:columnHeader tag was not generated');
}
