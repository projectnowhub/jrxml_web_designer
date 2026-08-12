/**
 * Test the JRXML auto-fix functionality
 */

import { validateJRXML, autoFixJRXML } from '../src/utils/jrxml/xsdValidator';
import * as fs from 'fs';
import * as path from 'path';

async function testAutoFix() {
  console.log('=== Testing the auto-fix functionality ===\n');

  // Read the test file containing invalid attributes
  const testFile = path.join(__dirname, 'test_autofix_invalid_attrs.jrxml');
  const originalContent = fs.readFileSync(testFile, 'utf-8');

  console.log('The original JRXML content contains the following invalid attributes:');
  console.log('- jasperReport: invalidAttribute1, anotherInvalid');
  console.log('- reportElement: customBadAttr\n');

  // 1. Validate whether the original content complies with the spec
  console.log('1. Validating the original content...');
  const originalValidation = await validateJRXML(originalContent);
  console.log(`   Valid: ${originalValidation.valid ? '✓' : '✗'}`);
  if (!originalValidation.valid) {
    console.log(`   Error count: ${originalValidation.errors.length}`);
    originalValidation.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. Line ${err.line}:${err.column} - ${err.message}`);
    });
  }
  console.log('');

  // 2. Run the auto-fix
  console.log('2. Running the auto-fix...');
  const fixResult = await autoFixJRXML(originalContent);
  console.log(`   Fixed: ${fixResult.fixed ? '✓' : '✗'}`);
  console.log(`   Number of fixes: ${fixResult.fixes.length}`);
  fixResult.fixes.forEach((fix, i) => {
    console.log(`   ${i + 1}. Line ${fix.lineNumber} - removed attribute '${fix.attributeName}' from <${fix.elementName}>`);
  });
  console.log('');

  // 3. Validate the fixed content
  console.log('3. Validating the fixed content...');
  const fixedValidation = await validateJRXML(fixResult.fixedContent);
  console.log(`   Valid: ${fixedValidation.valid ? '✓' : '✗'}`);
  if (fixedValidation.valid) {
    console.log('   All attributes comply with the spec ✓');
  } else {
    console.log(`   Still has ${fixedValidation.errors.length} error(s)`);
  }
  console.log('');

  // 4. Print the fixed content (for comparison)
  console.log('4. Fixed content:');
  console.log('='.repeat(60));
  console.log(fixResult.fixedContent);
  console.log('='.repeat(60));
  console.log('');

  // Write the fixed content to a file
  const outputFile = path.join(__dirname, 'test_autofix_fixed.jrxml');
  fs.writeFileSync(outputFile, fixResult.fixedContent, 'utf-8');
  console.log(`5. Fixed content written to: ${outputFile}`);
}

// Run the test
testAutoFix().catch(console.error);
