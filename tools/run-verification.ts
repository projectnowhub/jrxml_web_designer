/**
 * JRXML official library verification execution script
 *
 * This script will:
 * 1. Check the Java environment
 * 2. Download the JasperReports library (if not present)
 * 3. Compile the validator
 * 4. Run the compilation test
 * 5. Output detailed results
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const execAsync = promisify(exec);

class JRXMLVerifier {
  private libDir: string;
  private toolsDir: string;
  private jasperReportsJar: string;
  private jasperReportsVersion: string = '6.20.0';

  constructor() {
    this.libDir = path.join(__dirname, '..', 'lib');
    this.toolsDir = path.join(__dirname, '..', 'tools');
    this.jasperReportsJar = path.join(this.libDir, `jasperreports-${this.jasperReportsVersion}.jar`);
  }

  async run(): Promise<void> {
    console.log('==========================================');
    console.log('JRXML Compilation Verification (official JasperReports library)');
    console.log('==========================================\n');

    try {
      // Step 1: check Java
      console.log('Step 1: Checking the Java environment');
      await this.checkJava();
      console.log('');

      // Step 2: check/download the JasperReports library
      console.log('Step 2: Checking the JasperReports library');
      await this.checkJasperReports();
      console.log('');

      // Step 3: compile the validator
      console.log('Step 3: Compiling JRXMLCompiler');
      await this.compileCompiler();
      console.log('');

      // Step 4: run the compilation test
      console.log('Step 4: Running the compilation test');
      await this.runCompilationTest();
      console.log('');

      console.log('==========================================');
      console.log('✅ Verification complete!');
      console.log('==========================================');

    } catch (error: any) {
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  private async checkJava(): Promise<void> {
    try {
      const { stdout } = await execAsync('java -version');
      const version = stdout.split('\n')[0];
      console.log(`✓ Java is installed: ${version}`);
    } catch {
      throw new Error('Java is not installed. Please install Java JDK 8+');
    }
  }

  private async checkJasperReports(): Promise<void> {
    if (fs.existsSync(this.jasperReportsJar)) {
      console.log(`✓ JasperReports library already exists: ${this.jasperReportsJar}`);
      return;
    }

    console.log('⚠ JasperReports library not found, attempting to download...');

    // Create the lib directory
    if (!fs.existsSync(this.libDir)) {
      fs.mkdirSync(this.libDir, { recursive: true });
    }

    const url = `https://sourceforge.net/projects/jasperreports/files/jasperreports/${this.jasperReportsVersion}/jasperreports-${this.jasperReportsVersion}.jar/download`;
    console.log(`Download URL: ${url}`);

    try {
      await this.downloadFile(url, this.jasperReportsJar);
      console.log('✓ Download complete');
    } catch (error: any) {
      throw new Error(`Failed to download the JasperReports library: ${error.message}`);
    }
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow the redirect
          https.get(response.headers.location!, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      }).on('error', (error) => {
        fs.unlink(destPath, () => {});
        reject(error);
      });
    });
  }

  private async compileCompiler(): Promise<void> {
    try {
      const command = `javac -cp "${this.jasperReportsJar}" "${path.join(this.toolsDir, 'JRXMLCompiler.java')}"`;
      await execAsync(command);
      console.log('✓ JRXMLCompiler compiled successfully');
    } catch (error: any) {
      throw new Error(`Failed to compile JRXMLCompiler: ${error.message}`);
    }
  }

  private async runCompilationTest(): Promise<void> {
    // Generate the test JRXML
    const testDir = path.join(__dirname, '..', 'test-reports');
    const outputDir = path.join(__dirname, '..', 'test-compiled');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate the test file
    const testJRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
    http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
    name="TestTextField"
    pageWidth="595"
    pageHeight="842"
    columnWidth="555"
    leftMargin="20"
    rightMargin="20"
    topMargin="20"
    bottomMargin="20"
    uuid="test-textfield-001">

    <field name="fieldName" class="java.lang.String"/>

    <detail>
        <band height="30">
            <textField isBlankWhenNull="true">
                <reportElement x="0" y="0" width="200" height="20" uuid="text-001"/>
                <textElement textAlignment="Left" verticalAlignment="Top">
                    <font fontName="SansSerif" size="12"/>
                </textElement>
                <textFieldExpression><![CDATA[$F{fieldName}]]></textFieldExpression>
            </textField>
        </band>
    </detail>
</jasperReport>`;

    const testFile = path.join(testDir, 'test_textfield.jrxml');
    const outputFile = path.join(outputDir, 'test_textfield.jasper');

    fs.writeFileSync(testFile, testJRXML, 'utf-8');
    console.log(`✓ Test JRXML generated: ${testFile}`);

    // Run the compilation
    console.log('\nCompiling...');
    try {
      const command = `java -cp "${this.toolsDir}:${this.jasperReportsJar}" JRXMLCompiler "${testFile}" "${outputFile}"`;
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000
      });

      console.log(stdout);

      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(`✓ jasper file generated: ${outputFile} (${stats.size} bytes)`);
        console.log('\n==========================================');
        console.log('✅ Compilation succeeded! The JRXML can be compiled by JasperReports');
        console.log('==========================================');
      } else {
        throw new Error('Output file was not generated');
      }
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw new Error('JRXML compilation failed');
    }
  }
}

// Run the verification
const verifier = new JRXMLVerifier();
verifier.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
