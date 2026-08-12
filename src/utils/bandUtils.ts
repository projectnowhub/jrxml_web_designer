// Band-related utility functions

import type { Band,BandType } from '@/types';
import { BAND_TYPE_CONSTANTS, BAND_HEIGHT_CONSTANTS, BAND_CONSTANTS } from '@/constants/constants';
import i18n from '@/i18n';

// Get the display name of a Band
export function getBandDisplayName(bandType: string): string {
  // @ts-ignore
  return i18n.global.t(`bandNames.${bandType}`);
}

// Create a new Band
export function createNewBand(bandType: BandType): Band {
  return {
    type: bandType,
    height: BAND_HEIGHT_CONSTANTS[bandType as keyof typeof BAND_HEIGHT_CONSTANTS] || 50,
    splitType: 'Stretch',
    elements:[]
  };
}

// Get the default height of a Band
export function getBandDefaultHeight(bandType: BandType): number {
  return BAND_HEIGHT_CONSTANTS[bandType as keyof typeof BAND_HEIGHT_CONSTANTS] || 50;
}

// Check whether a point is inside a Band
export function isPointInBand(y: number, band: Band, bandY: number): boolean {
  return y >= bandY && y <= bandY + band.height;
}

// Get the Y coordinate of a Band on the canvas
export function getBandYPosition(bands: Band[], targetBandType: string): number {
  let y = 0;
  const bandSpacing = BAND_CONSTANTS.SPACING; // spacing between bands
  let bandCount = 0;

  for (const band of bands) {
    if (band.type === targetBandType) {
      return y;
    }
    y += band.height;
    // Add spacing between bands, but not after the last band
    if (bandCount < bands.length - 1) {
      y += bandSpacing;
    }
    bandCount++;
  }
  return y;
}

// Get the Band located at a given Y coordinate
export function getBandAtY(bands: Band[], y: number): { band: Band | null, bandY: number } {
  let currentY = 0;
  const bandSpacing = BAND_CONSTANTS.SPACING; // spacing between bands

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (!band) continue;

    const bandBottom = currentY + band.height;

    if (y >= currentY && y <= bandBottom) {
      return { band, bandY: currentY };
    }
    currentY += band.height;
    // Add spacing between bands, but not after the last band
    if (i < bands.length - 1) {
      currentY += bandSpacing;
    }
  }
  return { band: null, bandY: currentY };
}

// Get the total height of all Bands
export function getTotalBandsHeight(bands: Band[]): number {
  if (bands.length === 0) return 0;

  const bandSpacing = BAND_CONSTANTS.SPACING; // spacing between bands
  const totalBandHeight = bands.reduce((total, band) => total + band.height, 0);
  const totalSpacing = (bands.length - 1) * bandSpacing; // only add spacing between bands

  return totalBandHeight + totalSpacing;
}

// Adjust the height of a Band
export function adjustBandHeight(bands: Band[], bandType: string, newHeight: number): Band[] {
  return bands.map(band =>
    band.type === bandType ? { ...band, height: newHeight } : band
  );
}


// Add a new Band at a given position
export function addBandAtPosition(bands: Band[], bandType: BandType, position?: number): Band[] {
  const newBand = createNewBand(bandType);

  if (position === undefined) {
    // If no position is specified, add to the end
    return [...bands, newBand];
  }

  // Insert at the specified position
  const newBands = [...bands];
  newBands.splice(position, 0, newBand);
  return newBands;
}

// Remove a Band
export function removeBand(bands: Band[], bandType: string): Band[] {
  return bands.filter(band => band.type !== bandType);
}

// Check whether a Band exists
export function bandExists(bands: Band[], bandType: string): boolean {
  return bands.some(band => band.type === bandType);
}

// Get the split type options for a Band
export function getBandSplitOptions(): Array<{ value: string, label: string }> {
  return [
    { value: 'Stretch', label: 'Stretch' },
    { value: 'Prevent', label: 'Prevent' },
    { value: 'Immediate', label: 'Immediate' },
  ];
}
