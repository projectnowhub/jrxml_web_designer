import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import java.io.*;

/**
 * JRXML compilation validator (using the official JasperReports library)
 * Supports JasperReports 6.21.5
 *
 * Compile command:
 * javac -cp jasperreports-6.21.5.jar JRXMLCompiler.java
 *
 * Run command:
 * java -cp .:jasperreports-6.21.5.jar JRXMLCompiler input.jrxml
 */

public class JRXMLCompiler {

    /**
     * Compiles a JRXML file
     * @param inputPath path to the JRXML file
     * @param outputPath path to the output jasper file
     * @return whether compilation succeeded
     */
    public static boolean compile(String inputPath, String outputPath) {
        try {
            System.out.println("Compiling: " + inputPath);

            // 1. Load the JRXML
            InputStream is = new FileInputStream(inputPath);
            JasperDesign jasperDesign = JRXmlLoader.load(is);
            is.close();

            System.out.println("✓ JRXML loaded successfully");
            System.out.println("  Report name: " + jasperDesign.getName());
            System.out.println("  Page size: " + jasperDesign.getPageWidth() + " x " + jasperDesign.getPageHeight());
            System.out.println("  Column width: " + jasperDesign.getColumnWidth());

            // 2. Compile the JRXML
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);

            System.out.println("✓ JRXML compiled successfully");

            // 3. Save the jasper file
            ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(outputPath));
            oos.writeObject(jasperReport);
            oos.close();

            System.out.println("✓ jasper file saved: " + outputPath);

            return true;

        } catch (JRException e) {
            System.err.println("✗ Compilation failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        } catch (FileNotFoundException e) {
            System.err.println("✗ File not found: " + inputPath);
            return false;
        } catch (Exception e) {
            System.err.println("✗ Unknown error: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Validates JRXML syntax only (without compiling)
     * @param inputPath path to the JRXML file
     * @return whether validation succeeded
     */
    public static boolean validate(String inputPath) {
        try {
            System.out.println("Validating: " + inputPath);

            InputStream is = new FileInputStream(inputPath);
            JasperDesign jasperDesign = JRXmlLoader.load(is);
            is.close();

            System.out.println("✓ JRXML syntax validation passed");
            System.out.println("  Report name: " + jasperDesign.getName());

            return true;

        } catch (JRException e) {
            System.err.println("✗ Validation failed: " + e.getMessage());
            return false;
        } catch (Exception e) {
            System.err.println("✗ Unknown error: " + e.getMessage());
            return false;
        }
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Usage:");
            System.out.println("  java JRXMLCompiler <input.jrxml> [output.jasper]");
            System.out.println("");
            System.out.println("Examples:");
            System.out.println("  java JRXMLCompiler report.jrxml");
            System.out.println("  java JRXMLCompiler report.jrxml report.jasper");
            System.exit(1);
        }

        String inputPath = args[0];
        String outputPath;

        if (args.length >= 2) {
            outputPath = args[1];
        } else {
            // Default output path: replace .jrxml with .jasper
            outputPath = inputPath.replace(".jrxml", ".jasper");
        }

        boolean success = compile(inputPath, outputPath);

        System.exit(success ? 0 : 1);
    }
}
