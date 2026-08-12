/**
 * JRXML validator (dependencies managed with Maven)
 *
 * This class uses the official JasperReports library to perform JRXML compilation validation
 */

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import java.io.*;

public class JRXMLValidator {

    /**
     * Compiles a JRXML file
     */
    public static boolean compile(String inputPath, String outputPath) {
        try {
            System.out.println("Compiling: " + inputPath);

            // Load the JRXML
            InputStream is = new FileInputStream(inputPath);
            JasperDesign jasperDesign = JRXmlLoader.load(is);
            is.close();

            System.out.println("✓ JRXML loaded successfully");
            System.out.println("  Report name: " + jasperDesign.getName());
            System.out.println("  Page size: " + jasperDesign.getPageWidth() + " x " + jasperDesign.getPageHeight());
            System.out.println("  Column width: " + jasperDesign.getColumnWidth());

            // Compile the JRXML
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);

            System.out.println("✓ JRXML compiled successfully");

            // Save the jasper file
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

    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Usage:");
            System.out.println("  java JRXMLValidator <input.jrxml> [output.jasper]");
            System.out.println("");
            System.out.println("Examples:");
            System.out.println("  java JRXMLValidator report.jrxml");
            System.out.println("  java JRXMLValidator report.jrxml report.jasper");
            System.exit(1);
        }

        String inputPath = args[0];
        String outputPath;

        if (args.length >= 2) {
            outputPath = args[1];
        } else {
            outputPath = inputPath.replace(".jrxml", ".jasper");
        }

        boolean success = compile(inputPath, outputPath);

        System.exit(success ? 0 : 1);
    }
}
