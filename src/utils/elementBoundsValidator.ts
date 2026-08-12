import type { ReportProperties, Band, DesignElement } from '../types';
import { BAND_CONSTANTS } from '@/constants/constants';

/**
 * Validate whether an element exceeds the page boundaries
 * @param element The element to validate
 * @param band The Band that contains the element
 * @param bandIndex The index of the Band
 * @param bands The array of all Bands
 * @param reportProperties The report properties
 * @returns The validation result, including whether it is out of bounds and the type of overflow
 */
export function validateElementBounds(
  element: DesignElement,
  band: Band,
  bandIndex: number,
  bands: Band[],
  reportProperties: ReportProperties
): {
  isOutOfBounds: boolean;
  exceedsLeft: boolean;
  exceedsRight: boolean;
  exceedsBottom: boolean;
  exceedsTop: boolean;
  exceedsBandTop: boolean;
  exceedsBandBottom: boolean;
  exceedsBand: boolean;
  bandOffsetY: number;
} {
  // Calculate the Y position of the current band on the page (accounting for the height and spacing of all preceding bands)
  let bandOffsetY = reportProperties.topMargin; // Start from the page's top margin

  // Accumulate the height and spacing of all preceding bands
  for (let i = 0; i < bandIndex; i++) {
    const currentBand = bands[i];
    if (currentBand) {
      const bandSpacing = BAND_CONSTANTS.SPACING; // spacing between bands
      bandOffsetY += currentBand.height + bandSpacing; // Add the band's height and spacing
    }
  }

  // Calculate the available area (accounting for margins)
  // Element coordinates are relative to the band, so the available width within the band is the full page width minus the left/right margins
  const availableWidth = reportProperties.pageWidth - reportProperties.leftMargin - reportProperties.rightMargin;
  // const availableHeight = reportProperties.pageHeight - reportProperties.topMargin - reportProperties.bottomMargin; // not currently used

  // Calculate the actual position and size of the element
  const elementRight = element.x + element.width;
  const elementBottom = element.y + element.height;

  // Check whether it exceeds the left side of the band (element coordinates are relative to the band, so the left boundary is 0)
  const exceedsLeft = element.x < 0;

  // Check whether it exceeds the right side of the band (element coordinates are relative to the band, so the right boundary is the available width)
  const exceedsRight = elementRight > availableWidth;

  // Check whether it exceeds the current Band
  const exceedsBandTop = element.y < 0;
  const exceedsBandBottom = elementBottom > band.height;

  // Check whether it exceeds the top of the page (only for the first band)
  let exceedsTop = false;
  if (bandIndex === 0) {
    // Elements in the first band must not exceed the top of the page
    const elementActualTop = bandOffsetY + element.y;
    const pageTopBoundary = reportProperties.topMargin;
    exceedsTop = elementActualTop < pageTopBoundary;
  }

  // Check whether it exceeds the bottom of the page (only for the last band)
  let exceedsPageBottom = false;
  if (bandIndex === bands.length - 1) {
    // Elements in the last band must not exceed the bottom of the page
    const elementActualBottom = bandOffsetY + elementBottom;
    const pageBottomBoundary = reportProperties.pageHeight - reportProperties.bottomMargin;
    exceedsPageBottom = elementActualBottom > pageBottomBoundary;
  }

  // Check whether it exceeds the bottom of the page (for bands other than the last one)
  let exceedsBottom = false;
  if (bandIndex < bands.length - 1) {
    // Elements in bands other than the last one must not exceed the bottom of the page
    const elementActualBottom = bandOffsetY + elementBottom;
    const pageBottomBoundary = reportProperties.pageHeight - reportProperties.bottomMargin;
    exceedsBottom = elementActualBottom > pageBottomBoundary;
  } else {
    // For the last band, use the value of exceedsPageBottom
    exceedsBottom = exceedsPageBottom;
  }

  // For the last band, if the element does not exceed the bottom of the page, it should not be restricted for exceeding the band's bottom
  let adjustedExceedsBandBottom = exceedsBandBottom;
  if (bandIndex === bands.length - 1 && !exceedsBottom) {
    // If this is the last band and the element does not exceed the bottom of the page, allow the element to exceed the band's bottom
    adjustedExceedsBandBottom = false;
  }

  return {
    isOutOfBounds: exceedsLeft || exceedsRight || exceedsBottom || exceedsTop || adjustedExceedsBandBottom,
    exceedsLeft,
    exceedsRight,
    exceedsBottom,
    exceedsTop,
    exceedsBandTop,
    exceedsBandBottom: adjustedExceedsBandBottom,
    exceedsBand: exceedsBandTop || adjustedExceedsBandBottom,
    bandOffsetY
  };
}

/**
 * Get all elements that are out of bounds
 * @param bands The array of all Bands
 * @param reportProperties The report properties
 * @returns A list of out-of-bounds elements, including element info and the type of overflow
 */
export function getOutOfBoundsElements(
  bands: Band[],
  reportProperties: ReportProperties
): Array<{
  bandIndex: number;
  elementIndex: number;
  element: DesignElement;
  exceedsLeft: boolean;
  exceedsRight: boolean;
  exceedsBottom: boolean;
  exceedsTop: boolean;
  exceedsBandTop: boolean;
  exceedsBandBottom: boolean;
  exceedsBand: boolean;
}> {
  const outOfBoundsElements: Array<{
    bandIndex: number;
    elementIndex: number;
    element: DesignElement;
    exceedsLeft: boolean;
    exceedsRight: boolean;
    exceedsBottom: boolean;
    exceedsTop: boolean;
    exceedsBandTop: boolean;
    exceedsBandBottom: boolean;
    exceedsBand: boolean;
  }> = [];

  bands.forEach((band, bandIndex) => {
    band.elements.forEach((element, elementIndex) => {
      const validation = validateElementBounds(element, band, bandIndex, bands, reportProperties);

      if (validation.isOutOfBounds) {
        outOfBoundsElements.push({
          bandIndex,
          elementIndex,
          element,
          exceedsLeft: validation.exceedsLeft,
          exceedsRight: validation.exceedsRight,
          exceedsBottom: validation.exceedsBottom,
          exceedsTop: validation.exceedsTop,
          exceedsBandTop: validation.exceedsBandTop,
          exceedsBandBottom: validation.exceedsBandBottom,
          exceedsBand: validation.exceedsBand
        });
      }
    });
  });

  return outOfBoundsElements;
}

/**
 * Check whether the report design is valid (all elements are within bounds)
 * @param bands The array of all Bands
 * @param reportProperties The report properties
 * @returns Whether the report design is valid
 */
export function isReportDesignValid(
  bands: Band[],
  reportProperties: ReportProperties
): boolean {
  const outOfBoundsElements = getOutOfBoundsElements(bands, reportProperties);
  return outOfBoundsElements.length === 0;
}

/**
 * Get the validation error messages for the report design
 * @param bands The array of all Bands
 * @param reportProperties The report properties
 * @returns An array of validation error messages
 */
export function getReportDesignValidationErrors(
  bands: Band[],
  reportProperties: ReportProperties
): string[] {
  const errors: string[] = [];
  const outOfBoundsElements = getOutOfBoundsElements(bands, reportProperties);

  // Calculate the total height of all Bands, accounting for the spacing between bands
  const totalBandsHeight = bands.reduce((total, band, index) => {
    return total + band.height + (index < bands.length - 1 ? BAND_CONSTANTS.SPACING : 0); // Add band spacing, except after the last band
  }, 0);
  const availableHeight = reportProperties.pageHeight - reportProperties.topMargin - reportProperties.bottomMargin;

  // Check whether the total height of the bands exceeds the page
  if (totalBandsHeight > availableHeight) {
    errors.push(`Invalid report design: the detail area, page/column headers and footers, and margins do not fit within the page height.`);
  }

  // Check each out-of-bounds element
  outOfBoundsElements.forEach(({ bandIndex, elementIndex, exceedsLeft, exceedsRight, exceedsBottom, exceedsTop, exceedsBandTop, exceedsBandBottom, exceedsBand }) => {
    if (bands[bandIndex]) {
      const bandName = bands[bandIndex].type;
      const elementInfo = `Element ${elementIndex + 1} in the ${bandName} band`;

      if (exceedsTop) {
        errors.push(`${elementInfo} exceeds the top boundary of the page`);
      }

      if (exceedsLeft) {
        errors.push(`${elementInfo} exceeds the left boundary of the ${bandName} band`);
      }

      if (exceedsRight) {
        errors.push(`${elementInfo} exceeds the right boundary of the ${bandName} band`);
      }

      if (exceedsBottom) {
        errors.push(`${elementInfo} exceeds the bottom boundary of the page`);
      }

      if (exceedsBandTop) {
        errors.push(`${elementInfo} exceeds the top boundary of the ${bandName} band`);
      }

      if (exceedsBandBottom) {
        errors.push(`${elementInfo} exceeds the bottom boundary of the ${bandName} band`);
      }

      if (exceedsBand) {
        errors.push(`${elementInfo} exceeds the boundary of the ${bandName} band`);
      }
    }
  });

  return errors;
}
