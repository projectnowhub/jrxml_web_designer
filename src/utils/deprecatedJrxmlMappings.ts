/**
 * JRXML deprecated tag and attribute mapping table
 * Used to convert deprecated tags/attributes to their currently recommended equivalents
 */

// Mapping of deprecated attributes to their new attribute names
export const DEPRECATED_ATTRIBUTES_MAP: Record<string, string> = {
  // textElement attributes
  'isStyledText': 'markup', // isStyledText="true" -> markup="styled"

  // textField attributes
  'isStretchWithOverflow': 'textAdjust', // isStretchWithOverflow="true" -> textAdjust="StretchHeight"

  // band attributes
  'isSplitAllowed': 'splitType', // isSplitAllowed="true" -> splitType="Stretch"

  // reportElement attributes
  'mode': 'mode', // This attribute is not deprecated, but must use the correct value
};

// Mapping of deprecated attributes to their new values (values that need special handling)
export const DEPRECATED_ATTRIBUTE_VALUES_MAP: Record<string, Record<string, any>> = {
  // isStyledText -> markup
  'isStyledText': {
    'true': 'styled',
    'false': 'none'
  },

  // isStretchWithOverflow -> textAdjust
  'isStretchWithOverflow': {
    'true': 'StretchHeight',
    'false': 'CutText'
  },

  // isSplitAllowed -> splitType
  'isSplitAllowed': {
    'true': 'Stretch',
    'false': 'Prevent'
  }
};

// Mapping of deprecated tags to their new tag names
export const DEPRECATED_ELEMENTS_MAP: Record<string, string> = {
  // Border-related tags
  'border': 'pen',
  'topBorder': 'topPen',
  'leftBorder': 'leftPen',
  'bottomBorder': 'bottomPen',
  'rightBorder': 'rightPen'
};

// Deprecated attributes on the box element
export const BOX_DEPRECATED_ATTRIBUTES: string[] = [
  'border', 'borderColor',
  'topBorder', 'topBorderColor',
  'leftBorder', 'leftBorderColor',
  'bottomBorder', 'bottomBorderColor',
  'rightBorder', 'rightBorderColor',
  'padding', 'topPadding', 'leftPadding', 'bottomPadding', 'rightPadding'
];

// Deprecated attributes on the graphicElement element
export const GRAPHIC_ELEMENT_DEPRECATED_ATTRIBUTES: string[] = [
  'pen', // Should use the pen child element instead
  'stretchType' // Should use stretchType on reportElement instead
];

/**
 * Check whether an attribute is deprecated
 * @param attributeName The attribute name
 * @returns true if the attribute is deprecated, false otherwise
 */
export function isAttributeDeprecated(attributeName: string): boolean {
  return attributeName in DEPRECATED_ATTRIBUTES_MAP;
}

/**
 * Check whether an element is deprecated
 * @param elementName The element name
 * @returns true if the element is deprecated, false otherwise
 */
export function isElementDeprecated(elementName: string): boolean {
  return elementName in DEPRECATED_ELEMENTS_MAP;
}

/**
 * Get the new attribute name for a deprecated attribute
 * @param attributeName The deprecated attribute name
 * @returns The new attribute name, or the original name if the attribute is not deprecated
 */
export function getNewAttributeName(attributeName: string): string {
  return DEPRECATED_ATTRIBUTES_MAP[attributeName] || attributeName;
}

/**
 * Get the new element name for a deprecated element
 * @param elementName The deprecated element name
 * @returns The new element name, or the original name if the element is not deprecated
 */
export function getNewElementName(elementName: string): string {
  return DEPRECATED_ELEMENTS_MAP[elementName] || elementName;
}

/**
 * Convert the value of a deprecated attribute
 * @param attributeName The attribute name
 * @param attributeValue The attribute value
 * @returns The converted attribute value
 */
export function convertAttributeValue(attributeName: string, attributeValue: string): string {
  if (attributeName in DEPRECATED_ATTRIBUTE_VALUES_MAP) {
    const valueMap = DEPRECATED_ATTRIBUTE_VALUES_MAP[attributeName];
    if (valueMap && attributeValue in valueMap) {
      return valueMap[attributeValue];
    }
  }
  return attributeValue;
}

/**
 * Check whether an attribute on the box element is deprecated
 * @param attributeName The attribute name
 * @returns true if the attribute is deprecated, false otherwise
 */
export function isBoxAttributeDeprecated(attributeName: string): boolean {
  return BOX_DEPRECATED_ATTRIBUTES.includes(attributeName);
}

/**
 * Check whether an attribute on the graphicElement element is deprecated
 * @param attributeName The attribute name
 * @returns true if the attribute is deprecated, false otherwise
 */
export function isGraphicElementAttributeDeprecated(attributeName: string): boolean {
  return GRAPHIC_ELEMENT_DEPRECATED_ATTRIBUTES.includes(attributeName);
}