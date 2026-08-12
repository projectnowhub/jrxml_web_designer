// File-operation-related utility functions

import type { ReportData } from '@/types';

// Local storage key names
const STORAGE_KEYS = {
  REPORT_DATA: 'pdf_report_data',
  REPORT_NAME: 'pdf_report_name',
  AUTO_SAVE: 'pdf_auto_save',
};

// Save report data to local storage
export function saveToLocalStorage(reportData: ReportData, reportName: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REPORT_DATA, JSON.stringify(reportData));
    localStorage.setItem(STORAGE_KEYS.REPORT_NAME, reportName);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, new Date().toISOString());
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
}

// Load report data from local storage
export function loadFromLocalStorage(): { reportData: ReportData | null, reportName: string | null } {
  try {
    const reportDataStr = localStorage.getItem(STORAGE_KEYS.REPORT_DATA);
    const reportName = localStorage.getItem(STORAGE_KEYS.REPORT_NAME);

    if (reportDataStr && reportDataStr !== 'undefined') {
      const reportData = JSON.parse(reportDataStr);
      return { reportData, reportName };
    }
  } catch (error) {
    console.error('Failed to load from local storage:', error);
  }

  return { reportData: null, reportName: null };
}

// Clear local storage
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.REPORT_DATA);
    localStorage.removeItem(STORAGE_KEYS.REPORT_NAME);
    localStorage.removeItem(STORAGE_KEYS.AUTO_SAVE);
  } catch (error) {
    console.error('Failed to clear local storage:', error);
  }
}

// Check whether local storage has data
export function hasLocalStorageData(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.REPORT_DATA);
}

// Get the auto-save time
export function getAutoSaveTime(): Date | null {
  try {
    const autoSaveStr = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE);
    if (autoSaveStr) {
      return new Date(autoSaveStr);
    }
  } catch (error) {
    console.error('Failed to get auto-save time:', error);
  }
  return null;
}

// Download a file
export function downloadFile(content: string, fileName: string, contentType: string = 'application/json'): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download the report template
export function downloadReportTemplate(reportData: ReportData, reportName: string): void {
  const content = JSON.stringify(reportData, null, 2);
  const fileName = `${reportName || 'report'}.json`;
  downloadFile(content, fileName, 'application/json');
}

// Download the JRXML file
export function downloadJRXML(jrxmlContent: string, reportName: string): void {
  const fileName = `${reportName || 'report'}.jrxml`;
  downloadFile(jrxmlContent, fileName, 'application/xml');
}

// Upload a file
export function uploadFile(accept: string = '.json,.jrxml'): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };

    input.oncancel = () => {
      reject(new Error('File selection was cancelled'));
    };

    input.click();
  });
}

// Read file content
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file content'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File read error'));
    };

    reader.readAsText(file);
  });
}

// Load a JSON report template
export async function loadJSONTemplate(): Promise<{ reportData: ReportData, fileName: string }> {
  try {
    const file = await uploadFile('.json');
    const content = await readFileAsText(file);
    const reportData = JSON.parse(content) as ReportData;
    return { reportData, fileName: file.name };
  } catch (error) {
    throw new Error(`Failed to load JSON template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Load a JRXML template
export async function loadJRXMLTemplate(): Promise<{ jrxmlContent: string, fileName: string }> {
  try {
    const file = await uploadFile('.jrxml');
    const content = await readFileAsText(file);
    return { jrxmlContent: content, fileName: file.name };
  } catch (error) {
    throw new Error(`Failed to load JRXML template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Validate report data
export function validateReportData(reportData: any): { isValid: boolean, errors: string[] } {
  const errors: string[] = [];

  if (!reportData) {
    errors.push('Report data is empty');
    return { isValid: false, errors };
  }

  if (!reportData.name || typeof reportData.name !== 'string') {
    errors.push('Report name is invalid');
  }

  if (!reportData.bands || !Array.isArray(reportData.bands)) {
    errors.push('Report bands configuration is invalid');
  }

  if (!reportData.elements || !Array.isArray(reportData.elements)) {
    errors.push('Report elements configuration is invalid');
  }

  // Validate elements
  if (reportData.elements) {
    reportData.elements.forEach((element: any, index: number) => {
      if (!element.type) {
        errors.push(`Element ${index} is missing the type property`);
      }
      if (typeof element.x !== 'number' || typeof element.y !== 'number') {
        errors.push(`Element ${index} has invalid position coordinates`);
      }
      if (typeof element.width !== 'number' || typeof element.height !== 'number') {
        errors.push(`Element ${index} has invalid dimensions`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export report data as a JSON Blob
export function exportToJSON(reportData: ReportData): Blob {
  const jsonString = JSON.stringify(reportData, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

// Import report data from a JSON file
export async function importFromJSON(file: File): Promise<ReportData> {
  try {
    const content = await readFileAsText(file);
    return JSON.parse(content) as ReportData;
  } catch (error) {
    throw new Error(`Failed to import JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export JRXML content as a Blob
export function exportToJRXML(jrxmlContent: string): Blob {
  return new Blob([jrxmlContent], { type: 'application/xml' });
}

// Import content from a JRXML file
export async function importFromJRXML(file: File): Promise<string> {
  try {
    return await readFileAsText(file);
  } catch (error) {
    throw new Error(`Failed to import JRXML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Validate JRXML format
export function validateJRXML(jrxmlContent: string): { isValid: boolean, errors: string[] } {
  const errors: string[] = [];

  try {
    // Basic XML format check
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(jrxmlContent.trim(), 'application/xml');

    // Check for parse errors - different browsers may detect errors differently
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      errors.push('XML format error: unable to parse XML content');
      return { isValid: false, errors };
    }

    // Check whether the root element is jasperReport
    const rootElement = xmlDoc.documentElement;
    if (rootElement.tagName !== 'jasperReport') {
      errors.push('JRXML must have jasperReport as its root element');
      return { isValid: false, errors };
    }

    // Check required attributes
    if (!rootElement.hasAttribute('name')) {
      errors.push('The jasperReport element is missing the name attribute');
    }

    if (!rootElement.hasAttribute('pageWidth')) {
      errors.push('The jasperReport element is missing the pageWidth attribute');
    }

    if (!rootElement.hasAttribute('pageHeight')) {
      errors.push('The jasperReport element is missing the pageHeight attribute');
    }

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`An error occurred while validating JRXML: ${error instanceof Error ? error.message : String(error)}`);
    return { isValid: false, errors };
  }
}
