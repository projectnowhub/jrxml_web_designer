import { describe, test, expect } from 'vitest';
import { generateJRXMLContent, parseJRXMLContent } from '../../src/utils/jrxmlGenerator';
import {
  getImageCornerRadii,
  IMAGE_CORNER_RADIUS_PROPERTY,
  imageCornerRadiusCss,
  setImageCornerRadii,
} from '../../src/utils/elementUtils';
import type { ReportProperties } from '../../src/types';

const properties = {
  name: 'ImageRadius', pageWidth: 595, pageHeight: 842,
  topMargin: 20, bottomMargin: 20, leftMargin: 20, rightMargin: 20,
} as ReportProperties;

const image = (): any => ({
  type: 'image', uuid: crypto.randomUUID(), x: 10, y: 10, width: 100, height: 60,
  imageExpression: '"logo.png"', scaleType: 'FillFrame',
});

const all = (r: number) => ({ topLeft: r, topRight: r, bottomRight: r, bottomLeft: r });

const roundTrip = (el: any) => {
  const xml = generateJRXMLContent(properties, [{ type: 'detail', height: 100, elements: [el] }], []);
  return { xml, parsed: parseJRXMLContent(xml).bands.find((b) => b.type === 'detail')!.elements[0]! };
};

describe('image corner radius', () => {
  test('the same radius on every corner is stored as one value and survives a round trip', () => {
    const el = image();
    setImageCornerRadii(el, all(12));
    const { xml, parsed } = roundTrip(el);
    expect(xml).toContain(`<property name="${IMAGE_CORNER_RADIUS_PROPERTY}" value="12"/>`);
    expect(getImageCornerRadii(parsed)).toEqual(all(12));
  });

  test('different corners are stored in CSS order and survive a round trip', () => {
    const el = image();
    const radii = { topLeft: 12, topRight: 0, bottomRight: 6, bottomLeft: 0 };
    setImageCornerRadii(el, radii);
    const { xml, parsed } = roundTrip(el);
    expect(xml).toContain(`<property name="${IMAGE_CORNER_RADIUS_PROPERTY}" value="12 0 6 0"/>`);
    expect(getImageCornerRadii(parsed)).toEqual(radii);
    expect(imageCornerRadiusCss(parsed)).toBe('12px 0px 6px 0px');
  });

  test('all corners at 0 removes it', () => {
    const el = image();
    setImageCornerRadii(el, all(8));
    setImageCornerRadii(el, all(0));
    expect(getImageCornerRadii(el)).toEqual(all(0));
    expect(imageCornerRadiusCss(el)).toBeUndefined();
    expect(el.properties).toBeUndefined();
  });
});
