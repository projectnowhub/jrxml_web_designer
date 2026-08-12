export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  code?: string;
  severity?: 'warning' | 'error' | 'fatal';
  elementName?: string;
  attributeName?: string;
}

let xsdContent: string | null = null;

export async function loadXsdSchema(): Promise<string> {
  if (xsdContent) {
    return xsdContent;
  }

  try {
    const response = await fetch('./jasperreport.xsd');
    if (!response.ok) {
      throw new Error(`Failed to load XSD file: ${response.status}`);
    }
    xsdContent = await response.text();
    return xsdContent;
  } catch (error) {
    console.error('Failed to load XSD schema:', error);
    throw error;
  }
}

function removeSchemaLocationAttribute(xmlContent: string): string {
  return xmlContent.replace(/\s*xsi:schemaLocation="[^"]*"/g, '');
}

function getLineNumber(xmlText: string, position: number): number {
  const textBeforePosition = xmlText.substring(0, position);
  const lines = textBeforePosition.split('\n');
  return lines.length + 1;
}

function getColumnNumber(xmlText: string, position: number): number {
  const textBeforePosition = xmlText.substring(0, position);
  const lastNewlineIndex = textBeforePosition.lastIndexOf('\n');
  if (lastNewlineIndex === -1) {
    return position + 1;
  }
  return position - lastNewlineIndex;
}

function findElementPositionInXml(xmlText: string, elementName: string, depth: number): { line: number; column: number } {
  const searchPattern = `<${elementName}`;
  let currentIndex = 0;
  let occurrenceCount = 0;
  
  while (currentIndex < xmlText.length) {
    const foundIndex = xmlText.indexOf(searchPattern, currentIndex);
    if (foundIndex === -1) break;
    
    occurrenceCount++;
    if (occurrenceCount === depth + 1) {
      return {
        line: getLineNumber(xmlText, foundIndex),
        column: getColumnNumber(xmlText, foundIndex)
      };
    }
    
    currentIndex = foundIndex + searchPattern.length;
  }
  
  return { line: 0, column: 0 };
}

function parseXmlLocal(xmlText: string): { document: Document | null; error: string | null } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { document: null, error: parserError.textContent || 'XML parse error' };
    }
    return { document: doc, error: null };
  } catch (error) {
    return { document: null, error: String(error) };
  }
}

function collectAllowedAttributesFromXsd(xsdText: string, elementName: string): Map<string, AllowedAttributeInfo> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsdText, 'application/xml');

  const attributes = new Map<string, AllowedAttributeInfo>();

  const elements = doc.querySelectorAll(`element[name="${elementName}"]`);
  elements.forEach(el => {
    const complexType = el.querySelector('complexType');
    if (complexType) {
      const attrElements = complexType.querySelectorAll('attribute');
      attrElements.forEach(attr => {
        const name = attr.getAttribute('name');
        if (name) {
          const use = attr.getAttribute('use');
          attributes.set(name, {
            required: use === 'required'
          });
        }
      });
    }
  });

  return attributes;
}

interface ElementDepthInfo {
  name: string;
  depth: number;
  occurrence: number;
}

function buildElementOccurrenceMap(xmlNode: Element, occurrenceMap: Map<string, number> = new Map()): Map<string, number> {
  const nodeName = xmlNode.localName || xmlNode.nodeName;
  const currentOccurrence = occurrenceMap.get(nodeName) || 0;
  occurrenceMap.set(nodeName, currentOccurrence + 1);
  
  for (const child of Array.from(xmlNode.children)) {
    buildElementOccurrenceMap(child, occurrenceMap);
  }
  
  return occurrenceMap;
}

function validateElementRecursive(
  xmlNode: Element,
  xsdText: string,
  xmlText: string,
  errors: ValidationError[],
  elementOccurrences: Map<string, number>,
  currentOccurrence: Map<string, number> = new Map(),
  depth: number = 0
): void {
  if (depth > 20) return;
  
  const nodeName = xmlNode.localName || xmlNode.nodeName;
  const nodeNs = xmlNode.namespaceURI;
  
  const thisElementOccurrence = currentOccurrence.get(nodeName) || 0;
  currentOccurrence.set(nodeName, thisElementOccurrence + 1);
  
  const allowedAttributes = collectAllowedAttributesFromXsd(xsdText, nodeName);
  const knownValidAttrs = KNOWN_VALID_ATTRIBUTES[nodeName] || [];

  if (allowedAttributes.size > 0) {
    for (const attr of Array.from(xmlNode.attributes)) {
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
        continue;
      }

      const attrLocalName = attr.localName || attr.name.split(':')[1] || attr.name;

      // If the attribute is neither in the allowed list nor in the known-valid attribute whitelist, report an error
      if (!allowedAttributes.has(attrLocalName) && !knownValidAttrs.includes(attrLocalName)) {
        const position = findElementPositionInXml(xmlText, nodeName, thisElementOccurrence);
        errors.push({
          line: position.line,
          column: position.column,
          message: `Element '${nodeName}' contains unknown attribute '${attrLocalName}'`,
          severity: 'error',
          code: 'XML_UNEXPECTED_ATTRIBUTE',
          elementName: nodeName,
          attributeName: attrLocalName
        });
      }
    }
  }
  
  for (const child of Array.from(xmlNode.children)) {
    validateElementRecursive(child, xsdText, xmlText, errors, elementOccurrences, currentOccurrence, depth + 1);
  }
}

export async function validateJRXML(xmlContent: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  try {
    const xsdText = await loadXsdSchema();
    
    const xmlForValidation = removeSchemaLocationAttribute(xmlContent);
    
    const parseResult = parseXmlLocal(xmlForValidation);
    if (parseResult.error || !parseResult.document) {
      return {
        valid: false,
        errors: [{
          line: 0,
          column: 0,
          message: `XML parse error: ${parseResult.error}`,
          severity: 'fatal',
          code: 'XML_PARSE_ERROR'
        }]
      };
    }
    
    const root = parseResult.document.documentElement;
    
    const elementOccurrences = buildElementOccurrenceMap(root);
    
    validateElementRecursive(root, xsdText, xmlForValidation, errors, elementOccurrences);
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('XSD validation failed:', error);
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `An error occurred during validation: ${String(error)}`,
        severity: 'fatal',
        code: 'VALIDATION_ERROR'
      }]
    };
  }
}

export function clearXsdCache(): void {
  xsdContent = null;
}

/**
 * Information about an allowed attribute
 */
export interface AllowedAttributeInfo {
  required: boolean;
}

/**
 * Whitelist of known-valid attributes
 * These attributes are not declared in the XSD spec, but are valid in practice
 */
const KNOWN_VALID_ATTRIBUTES: Record<string, string[]> = {
  'columnGroup': ['width'],
  'column': ['width'],
};

/**
 * Collect the set of attributes allowed for a given element from the XSD (including whether each is required)
 */
export async function getAllowedAttributesFromXsd(elementName: string): Promise<Map<string, AllowedAttributeInfo>> {
  const xsdText = await loadXsdSchema();
  return collectAllowedAttributesFromXsd(xsdText, elementName);
}

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  fixed: boolean;
  fixedContent: string;
  fixes: Array<{
    elementName: string;
    attributeName: string;
    lineNumber: number;
  }>;
  warnings: Array<{
    elementName: string;
    attributeName: string;
    message: string;
  }>;
}

/**
 * Auto-fix a JRXML by removing attributes that don't conform to the XSD spec
 */
export async function autoFixJRXML(xmlContent: string): Promise<AutoFixResult> {
  const fixes: AutoFixResult['fixes'] = [];
  const warnings: AutoFixResult['warnings'] = [];

  try {
    const xsdText = await loadXsdSchema();
    const xmlForValidation = removeSchemaLocationAttribute(xmlContent);

    const parseResult = parseXmlLocal(xmlForValidation);
    if (parseResult.error || !parseResult.document) {
      return {
        fixed: false,
        fixedContent: xmlContent,
        fixes: [],
        warnings: []
      };
    }

    const doc = parseResult.document;
    const root = doc.documentElement;

    // Recursively traverse and remove invalid attributes
    const removeInvalidAttributes = (xmlNode: Element, depth: number = 0): void => {
      if (depth > 20) return;

      const nodeName = xmlNode.localName || xmlNode.nodeName;
      const allowedAttributes = collectAllowedAttributesFromXsd(xsdText, nodeName);

      if (allowedAttributes.size > 0) {
        const attributesToRemove: string[] = [];
        const knownValidAttrs = KNOWN_VALID_ATTRIBUTES[nodeName] || [];

        for (const attr of Array.from(xmlNode.attributes)) {
          if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
            continue;
          }

          const attrLocalName = attr.localName || attr.name.split(':')[1] || attr.name;

          const attrInfo = allowedAttributes.get(attrLocalName);
          const isKnownValid = knownValidAttrs.includes(attrLocalName);

          // If the attribute is neither in the allowed list nor in the known-valid attribute whitelist
          if (!attrInfo && !isKnownValid) {
            const lineNumber = getLineNumber(xmlForValidation, xmlForValidation.indexOf(` ${attrLocalName}="`) !== -1
              ? xmlForValidation.indexOf(` ${attrLocalName}="`)
              : xmlForValidation.indexOf(`\n${attrLocalName}="`));

            // For certain known-required attributes, add a warning instead of removing them
            const knownRequiredAttrs = ['width', 'height', 'x', 'y'];
            if (knownRequiredAttrs.includes(attrLocalName)) {
              warnings.push({
                elementName: nodeName,
                attributeName: attrLocalName,
                message: `Attribute '${attrLocalName}' is not in the XSD spec, but may be required. Please check manually.`
              });
            } else {
              attributesToRemove.push(attr.name);
              fixes.push({
                elementName: nodeName,
                attributeName: attrLocalName,
                lineNumber
              });
            }
          }
        }

        // Remove invalid attributes
        for (const attrName of attributesToRemove) {
          xmlNode.removeAttribute(attrName);
        }
      }

      // Recursively process child elements
      for (const child of Array.from(xmlNode.children)) {
        removeInvalidAttributes(child, depth + 1);
      }
    };

    removeInvalidAttributes(root);

    // Serialize the fixed XML
    const serializer = new XMLSerializer();
    let fixedContent = serializer.serializeToString(doc);

    // Add the XML declaration (if missing)
    if (!fixedContent.startsWith('<?xml')) {
      fixedContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + fixedContent;
    }

    return {
      fixed: fixes.length > 0,
      fixedContent,
      fixes,
      warnings
    };
  } catch (error) {
    console.error('Auto-fix failed:', error);
    return {
      fixed: false,
      fixedContent: xmlContent,
      fixes: [],
      warnings: []
    };
  }
}