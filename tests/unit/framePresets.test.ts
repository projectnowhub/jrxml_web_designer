import { describe, test, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateJRXMLContent, parseJRXMLContent } from '../../src/utils/jrxmlGenerator';
import {
  applyBorderPreset,
  BORDER_PRESETS,
  buildFrameTemplate,
  clampPositionInBox,
  clampRectInBox,
  isBoxPart,
  markBoxPart,
  releaseBoxPart,
  fitChildrenToFrame,
  FRAME_TEMPLATE_TYPES,
  getActiveBorderPreset,
  getBorderSides,
  getSidePen,
  getUniformPen,
  decodeSidePens,
  encodeSidePens,
  getLayeredBorder,
  getRoundedLineEndBars,
  PAPER_COLOR,
  PAGE_BORDER_TYPE,
  ROUNDED_BORDER_PROPERTY,
  setAllSides,
  updateAllSides,
  updateSide,
  type FrameTemplateContext,
} from '../../src/utils/framePresets';
import type { Band, FrameElement, ReportProperties } from '../../src/types';

const ctx: FrameTemplateContext = {
  availableWidth: 555,
  availableHeight: 802,
  t: (key) => key.split('.').pop() || key,
};

const properties = {
  name: 'FramePresets',
  pageWidth: 595,
  pageHeight: 842,
  topMargin: 20,
  bottomMargin: 20,
  leftMargin: 20,
  rightMargin: 20,
} as ReportProperties;

const toDom = (xml: string) =>
  new JSDOM(xml, { contentType: 'application/xml' }).window.document;

const withUuid = (frame: FrameElement, x = 0, y = 0): FrameElement => ({
  ...frame,
  uuid: crypto.randomUUID(),
  x,
  y,
});

describe('frame templates', () => {
  test.each(FRAME_TEMPLATE_TYPES)('%s builds a frame whose children fit inside it', (type) => {
    const frame = buildFrameTemplate(type, ctx);
    expect(frame.type).toBe('frame');
    for (const child of frame.elements ?? []) {
      expect(child.uuid).toBeTruthy();
      expect(child.x + child.width).toBeLessThanOrEqual(frame.width);
      expect(child.y + child.height).toBeLessThanOrEqual(frame.height);
    }
  });

  test('children get fresh UUIDs on every build', () => {
    const a = buildFrameTemplate('frameKpiCard', ctx);
    const b = buildFrameTemplate('frameKpiCard', ctx);
    expect(a.elements![0]!.uuid).not.toBe(b.elements![0]!.uuid);
  });

  test('page border covers the printable area', () => {
    const border = buildFrameTemplate(PAGE_BORDER_TYPE, ctx);
    expect(border.width).toBe(555);
    expect(border.height).toBe(802);
  });
});

describe('frame templates in JRXML', () => {
  const bands: Band[] = [
    {
      type: 'detail',
      height: 400,
      elements: [
        withUuid(buildFrameTemplate('frameKpiCard', ctx), 0, 0),
        withUuid(buildFrameTemplate('frameTitledSection', ctx), 0, 100),
      ],
    },
    // Designer keeps the background band last; the XSD requires it first
    {
      type: 'background',
      height: 802,
      elements: [withUuid(buildFrameTemplate(PAGE_BORDER_TYPE, ctx))],
    },
  ];
  const jrxml = generateJRXMLContent(properties, bands, []);
  const doc = toDom(jrxml);

  test('background band is written before the other bands', () => {
    const bandNames = Array.from(doc.documentElement.children)
      .map((el) => el.localName)
      .filter((name) => ['background', 'detail'].includes(name));
    expect(bandNames).toEqual(['background', 'detail']);
  });

  test('page border frame carries its pen', () => {
    const pen = doc.querySelector('background frame > box > pen');
    expect(pen?.getAttribute('lineWidth')).toBe('1');
    expect(pen?.getAttribute('lineColor')).toBe('#1F3864');
  });

  test('KPI card is an opaque tinted frame with three text fields', () => {
    const card = doc.querySelector('detail frame');
    expect(card?.querySelector(':scope > reportElement')?.getAttribute('mode')).toBe('Opaque');
    expect(card?.querySelectorAll(':scope > textField').length).toBe(3);
  });

  test('round-trips through the parser', () => {
    const parsed = parseJRXMLContent(jrxml);
    const background = parsed.bands.find((b) => b.type === 'background');
    const border = background?.elements[0] as FrameElement;
    expect(border.type).toBe('frame');
    expect(border.width).toBe(555);
    expect(border.box?.pen?.lineWidth).toBe(1);

    const detail = parsed.bands.find((b) => b.type === 'detail');
    const card = detail?.elements[0] as FrameElement;
    expect(card.elements?.length).toBe(3);
    expect(card.backcolor?.toUpperCase()).toBe('#EFEEFA');
  });
});

describe('border editing', () => {
  const navy = { lineWidth: 1, lineStyle: 'Solid', lineColor: '#1F3864' };
  const full = { pen: navy };

  test('a shared pen draws all four sides', () => {
    expect(getBorderSides(full)).toEqual({ top: true, right: true, bottom: true, left: true });
    expect(getUniformPen(full)).toEqual(navy);
  });

  test('turning a side off splits the pen and drops the shared one', () => {
    const box = updateSide(full, 'left', null)!;
    expect(box.pen).toBeUndefined();
    expect(box.leftPen).toBeUndefined();
    expect(box.topPen).toEqual(navy);
    expect(getBorderSides(box)).toEqual({ top: true, right: true, bottom: true, left: false });
  });

  test('turning a side on with no border uses the default pen', () => {
    const box = updateSide(undefined, 'top', {});
    expect(getBorderSides(box)).toEqual({ top: true, right: false, bottom: false, left: false });
    expect(box?.topPen?.lineWidth).toBe(1);
  });

  test('each side keeps its own colour, width and style', () => {
    let box = updateSide(full, 'top', { lineColor: '#FF0000', lineWidth: 3 });
    box = updateSide(box, 'bottom', { lineStyle: 'Dashed' });
    expect(getSidePen(box, 'top')).toEqual({ lineWidth: 3, lineStyle: 'Solid', lineColor: '#FF0000' });
    expect(getSidePen(box, 'bottom')).toEqual({ ...navy, lineStyle: 'Dashed' });
    expect(getSidePen(box, 'left')).toEqual(navy);
    expect(getUniformPen(box)).toBe('mixed');
  });

  test('"all sides" changes one attribute on every side, keeping the rest', () => {
    const mixed = updateSide(full, 'top', { lineColor: '#FF0000' });
    const box = updateAllSides(mixed, { lineWidth: 2 });
    expect(getSidePen(box, 'top')).toEqual({ lineWidth: 2, lineStyle: 'Solid', lineColor: '#FF0000' });
    expect(getSidePen(box, 'left')).toEqual({ ...navy, lineWidth: 2 });
  });

  test('"all sides" collapses into one shared pen once the sides match', () => {
    const mixed = updateSide(full, 'top', { lineColor: '#FF0000' });
    const box = updateAllSides(mixed, { lineColor: '#1F3864' })!;
    expect(box.topPen).toBeUndefined();
    expect(box.pen).toEqual(navy);
  });

  test('"all sides" checkbox switches the missing sides on, or removes the border', () => {
    const topOnly = updateSide(undefined, 'top', { lineColor: '#FF0000' });
    const all = setAllSides(topOnly, true);
    expect(getBorderSides(all)).toEqual({ top: true, right: true, bottom: true, left: true });
    // New sides copy the existing line, so the four collapse into one shared pen
    expect(all?.pen?.lineColor).toBe('#FF0000');
    expect(setAllSides(full, false)).toBeUndefined();
  });

  test('"all sides" edits only change the sides that are on', () => {
    const leftOnly = updateSide(undefined, 'left', {});
    const box = updateAllSides(leftOnly, { lineWidth: 4 });
    expect(getBorderSides(box)).toEqual({ top: false, right: false, bottom: false, left: true });
    expect(getSidePen(box, 'left')?.lineWidth).toBe(4);
  });

  test('width 0 removes a side; removing all lines keeps padding', () => {
    expect(getBorderSides(updateSide(full, 'right', { lineWidth: 0 })).right).toBe(false);
    expect(setAllSides({ ...full, padding: 4 }, false)).toEqual({ padding: 4 });
  });

  test('side pens inherit unset attributes from the shared pen', () => {
    expect(getSidePen({ pen: navy, topPen: { lineColor: '#FF0000' } }, 'top')).toEqual({
      ...navy,
      lineColor: '#FF0000',
    });
    expect(getSidePen({ pen: navy, topPen: { lineWidth: 0 } }, 'top')).toBeNull();
  });

  test('top-only border is written to JRXML without the other sides', () => {
    const border = {
      ...withUuid(buildFrameTemplate(PAGE_BORDER_TYPE, ctx)),
      box: { topPen: { lineWidth: 1, lineStyle: 'Solid', lineColor: '#1F3864' } },
    };
    const xml = generateJRXMLContent(properties, [
      { type: 'detail', height: 100, elements: [] },
      { type: 'background', height: 802, elements: [border] },
    ], []);
    const box = toDom(xml).querySelector('background frame > box');
    expect(box?.querySelector('topPen')?.getAttribute('lineWidth')).toBe('1');
    expect(box?.querySelector('pen')).toBeNull();
    for (const side of ['leftPen', 'bottomPen', 'rightPen']) {
      const pen = box?.querySelector(side);
      expect(pen === null || pen.getAttribute('lineWidth') === '0').toBe(true);
    }
  });
});

describe('fitChildrenToFrame', () => {
  test('KPI card: text stretches with the width, caption follows the bottom edge', () => {
    const card = buildFrameTemplate('frameKpiCard', ctx);
    const [label, value, caption] = fitChildrenToFrame(
      card.elements!,
      { width: 130, height: 62 },
      { width: 200, height: 90 },
    );
    expect(label).toEqual({ x: 10, y: 8, width: 180, height: 11 });
    expect(value).toEqual({ x: 10, y: 20, width: 180, height: 22 });
    expect(caption).toEqual({ x: 10, y: 72, width: 180, height: 11 });
  });

  test('photo card: photo area grows, captions stay under it', () => {
    const card = buildFrameTemplate('framePhotoCard', ctx);
    const [photo, caption] = fitChildrenToFrame(
      card.elements!,
      { width: 250, height: 158 },
      { width: 250, height: 208 },
    );
    expect(photo!.height).toBe(160);
    expect(caption!.y).toBe(168);
  });

  test('shrinking never produces zero-size children', () => {
    const [header] = fitChildrenToFrame(
      [{ x: 0, y: 0, width: 555, height: 20 }],
      { width: 555, height: 120 },
      { width: 10, height: 120 },
    );
    expect(header!.width).toBeGreaterThanOrEqual(1);
  });
});

describe('border presets', () => {
  test('applying a preset makes it the active one', () => {
    for (const preset of BORDER_PRESETS) {
      expect(getActiveBorderPreset(applyBorderPreset({ pen: { lineWidth: 5 } }, preset.id))).toBe(preset.id);
    }
  });

  test('a hand-edited border matches no preset', () => {
    const box = updateSide(applyBorderPreset(undefined, 'outline'), 'top', { lineColor: '#FF0000' });
    expect(getActiveBorderPreset(box)).toBeNull();
  });

  test('presets replace lines but keep padding', () => {
    expect(applyBorderPreset({ padding: 6, pen: { lineWidth: 1 } }, 'leftAccent')).toEqual({
      padding: 6,
      leftPen: { lineWidth: 3, lineStyle: 'Solid', lineColor: '#7C5CF7' },
    });
  });

  test('every preset has a translation key', () => {
    for (const preset of BORDER_PRESETS) {
      expect(preset.labelKey).toMatch(/^framePresets\.style\./);
    }
  });

  test('right accent draws only the right side', () => {
    expect(getBorderSides(applyBorderPreset(undefined, 'rightAccent'))).toEqual({
      top: false, right: true, bottom: false, left: false,
    });
  });
});

describe('rounded frames', () => {
  const navy = { lineWidth: 0.75, lineStyle: 'Double', lineColor: '#1F3864' };
  const roundedCard = (): FrameElement => ({
    ...withUuid(buildFrameTemplate('frameKpiCard', ctx), 10, 10),
    radius: 8,
    box: { pen: navy, padding: 4 },
  });
  const generate = (frame: FrameElement) =>
    generateJRXMLContent(properties, [{ type: 'detail', height: 200, elements: [frame] }], []);

  test('is written as a frame holding a marked rounded rectangle with the line and fill', () => {
    const frame = toDom(generate(roundedCard())).querySelector('detail frame')!;
    expect(frame.querySelector(':scope > reportElement')?.getAttribute('mode')).toBe('Transparent');
    // The frame keeps its padding but draws no lines itself
    expect(frame.querySelector(':scope > box')?.getAttribute('padding')).toBe('4');
    expect(frame.querySelector(':scope > box pen')).toBeNull();

    const rect = frame.querySelector(':scope > rectangle')!;
    expect(rect.getAttribute('radius')).toBe('8');
    expect(rect.querySelector('property')?.getAttribute('name')).toBe(ROUNDED_BORDER_PROPERTY);
    expect(rect.querySelector('reportElement')?.getAttribute('backcolor')?.toUpperCase()).toBe('#EFEEFA');
    expect(rect.querySelector('pen')?.getAttribute('lineStyle')).toBe('Double');
    // Drawn before the card's text, so it sits behind it
    const children = Array.from(frame.children).map((c) => c.localName);
    expect(children.indexOf('rectangle')).toBeLessThan(children.indexOf('textField'));
  });

  test('round-trips back to a frame with a radius and no extra child', () => {
    const card = roundedCard();
    const parsed = parseJRXMLContent(generate(card));
    const frame = parsed.bands.find((b) => b.type === 'detail')!.elements[0] as FrameElement;
    expect(frame.radius).toBe(8);
    expect(frame.elements).toHaveLength(card.elements!.length);
    expect(frame.elements!.some((e) => e.type === 'rectangle')).toBe(false);
    expect(frame.box).toEqual({ padding: 4, pen: navy });
    expect(frame.mode).toBe('Opaque');
    expect(frame.backcolor?.toUpperCase()).toBe('#EFEEFA');
  });

  test('frames without a radius are unchanged', () => {
    const frame = toDom(generate({ ...roundedCard(), radius: 0 })).querySelector('detail frame')!;
    expect(frame.querySelector(':scope > rectangle')).toBeNull();
    expect(frame.querySelector(':scope > box pen')?.getAttribute('lineWidth')).toBe('0.75');
  });

  describe('accent following rounded corners', () => {
    const accentPen = { lineWidth: 3, lineStyle: 'Solid', lineColor: '#7C5CF7' };
    const pageBorder = (preset: 'leftAccent' | 'bottomAccent'): FrameElement => ({
      ...withUuid(buildFrameTemplate(PAGE_BORDER_TYPE, ctx)),
      radius: 12,
      box: applyBorderPreset(undefined, preset),
    });
    const shapes = (frame: FrameElement) =>
      Array.from(toDom(generate(frame)).querySelectorAll('detail frame > rectangle'));

    test('left accent: accent-filled back shape, white front shape inset on the left', () => {
      const [back, front] = shapes(pageBorder('leftAccent'));
      const attrs = (el: Element | undefined) => el?.querySelector('reportElement');
      expect(back?.getAttribute('radius')).toBe('12');
      expect(attrs(back)?.getAttribute('backcolor')).toBe('#7C5CF7');
      expect(back?.querySelector('pen')?.getAttribute('lineWidth')).toBe('0');
      expect(attrs(front)?.getAttribute('x')).toBe('3');
      expect(attrs(front)?.getAttribute('width')).toBe('552');
      expect(attrs(front)?.getAttribute('height')).toBe('802');
      expect(attrs(front)?.getAttribute('backcolor')).toBe(PAPER_COLOR);
    });

    test('bottom accent: front shape shortened at the bottom', () => {
      const [, front] = shapes(pageBorder('bottomAccent'));
      const el = front?.querySelector('reportElement');
      expect([el?.getAttribute('x'), el?.getAttribute('y'), el?.getAttribute('height')]).toEqual(['0', '0', '799']);
    });

    test('round-trips back to the accent and radius, exact widths kept', () => {
      const frame = { ...pageBorder('leftAccent'), box: { leftPen: { ...accentPen, lineWidth: 2.5 } } };
      const parsed = parseJRXMLContent(generate(frame)).bands.find((b) => b.type === 'detail')!
        .elements[0] as FrameElement;
      expect(parsed.radius).toBe(12);
      expect(parsed.box).toEqual({ leftPen: { ...accentPen, lineWidth: 2.5 } });
      expect(parsed.elements).toBeUndefined();
      // No background of its own: the white inside isn't turned into a fill
      expect(parsed.mode).not.toBe('Opaque');
    });

    test('a card keeps its tint as the inside colour', () => {
      const card = { ...roundedCard(), box: applyBorderPreset(undefined, 'leftAccent') };
      const [, front] = shapes(card);
      expect(front?.querySelector('reportElement')?.getAttribute('backcolor')?.toUpperCase()).toBe('#EFEEFA');
      const parsed = parseJRXMLContent(generate(card)).bands.find((b) => b.type === 'detail')!
        .elements[0] as FrameElement;
      expect(parsed.mode).toBe('Opaque');
      expect(parsed.elements).toHaveLength(card.elements!.length);
    });

    test('drawn solid in the colour of the first side (top, right, bottom, left)', () => {
      const layered = getLayeredBorder({
        radius: 4,
        box: { leftPen: { lineWidth: 2, lineStyle: 'Dashed', lineColor: '#FF0000' }, topPen: { lineWidth: 1, lineColor: '#00FF00' } },
      });
      expect(layered).toEqual({ color: '#00FF00', widths: { top: 1, right: 0, bottom: 0, left: 2 } });
      expect(getLayeredBorder({ radius: 4, box: { pen: accentPen } })).toBeNull();
      expect(getLayeredBorder({ radius: 0, box: { leftPen: accentPen } })).toBeNull();
    });
  });

  describe('rounded line ends', () => {
    const accent = (preset: 'leftAccent' | 'bottomAccent', width = 6): FrameElement => {
      const box = applyBorderPreset(undefined, preset)!;
      const key = preset === 'leftAccent' ? 'leftPen' : 'bottomPen';
      return {
        ...withUuid(buildFrameTemplate('frameKpiCard', ctx), 10, 10),
        roundedLineEnds: true,
        box: { [key]: { ...box[key]!, lineWidth: width } },
      };
    };
    const bars = (frame: FrameElement) =>
      Array.from(toDom(generate(frame)).querySelectorAll('detail frame > rectangle')).map((r) => {
        const el = r.querySelector('reportElement')!;
        return {
          radius: r.getAttribute('radius'),
          box: ['x', 'y', 'width', 'height'].map((a) => el.getAttribute(a)),
          backcolor: el.getAttribute('backcolor'),
          pen: r.querySelector('pen')?.getAttribute('lineWidth'),
        };
      });

    test('left accent becomes a full-height bar with semicircle ends', () => {
      expect(bars(accent('leftAccent'))).toEqual([
        { radius: '3', box: ['0', '0', '6', '62'], backcolor: '#7C5CF7', pen: '0' },
      ]);
    });

    test('bottom accent sits on the bottom edge', () => {
      expect(bars(accent('bottomAccent'))[0]!.box).toEqual(['0', '56', '130', '6']);
    });

    test('the frame itself draws no lines', () => {
      const frame = toDom(generate(accent('leftAccent'))).querySelector('detail frame')!;
      expect(frame.querySelector(':scope > box pen, :scope > box leftPen')).toBeNull();
    });

    test('round-trips with the exact pen and the flag', () => {
      const card = accent('leftAccent', 5.5);
      const parsed = parseJRXMLContent(generate(card)).bands.find((b) => b.type === 'detail')!
        .elements[0] as FrameElement;
      expect(parsed.roundedLineEnds).toBe(true);
      expect(parsed.box).toEqual(card.box);
      expect(parsed.radius).toBeUndefined();
      expect(parsed.elements).toHaveLength(card.elements!.length);
    });

    test('ignored for full borders and for rounded corners', () => {
      expect(getRoundedLineEndBars({ width: 10, height: 10, roundedLineEnds: true, box: { pen: { lineWidth: 2 } } })).toBeNull();
      expect(getRoundedLineEndBars({ ...accent('leftAccent'), radius: 8 })).toBeNull();
      expect(getRoundedLineEndBars({ ...accent('leftAccent'), roundedLineEnds: false })).toBeNull();
    });
  });

  test('side pens encode and decode for the JRXML property', () => {
    const box = { leftPen: { lineWidth: 2.5, lineStyle: 'Solid', lineColor: '#7C5CF7' }, topPen: { lineWidth: 1, lineStyle: 'Dashed', lineColor: '#000000' } };
    expect(decodeSidePens(encodeSidePens(box))).toEqual(box);
  });
});

describe('photo box', () => {
  test('the photo area is an empty image that prints as a grey block until a picture is added', () => {
    const photo = buildFrameTemplate('framePhotoCard', ctx).elements![0] as any;
    expect(photo.type).toBe('image');
    expect(photo.imageExpression).toBe('');
    // An empty image source would otherwise stop the PDF
    expect(photo.onErrorType).toBe('Blank');
    expect(photo.scaleType).toBe('RetainShape');
    expect(photo.mode).toBe('Opaque');
  });

  test('is written with an empty image expression and Blank on error', () => {
    const card = withUuid(buildFrameTemplate('framePhotoCard', ctx));
    const xml = generateJRXMLContent(properties, [{ type: 'detail', height: 200, elements: [card] }], []);
    const image = toDom(xml).querySelector('detail frame > image')!;
    expect(image.getAttribute('onErrorType')).toBe('Blank');
    expect(image.getAttribute('scaleImage')).toBe('RetainShape');
  });
});

describe('keeping items inside a box', () => {
  const box = { width: 200, height: 100 };

  test('moving pushes the item back inside, keeping its size', () => {
    expect(clampPositionInBox({ x: 180, y: -10, width: 50, height: 20 }, box)).toEqual({ x: 150, y: 0 });
    expect(clampPositionInBox({ x: 20, y: 30, width: 50, height: 20 }, box)).toEqual({ x: 20, y: 30 });
    // Wider than the box: stays at the left edge
    expect(clampPositionInBox({ x: 40, y: 0, width: 300, height: 20 }, box).x).toBe(0);
  });

  test('resizing trims the edges that go past the box', () => {
    expect(clampRectInBox({ x: 150, y: 80, width: 100, height: 50 }, box)).toEqual({
      x: 150, y: 80, width: 50, height: 20,
    });
    expect(clampRectInBox({ x: -30, y: -5, width: 100, height: 50 }, box)).toEqual({
      x: 0, y: 0, width: 70, height: 45,
    });
  });
});

describe('box parts', () => {
  test('every item a template builds is marked as part of its box', () => {
    for (const type of FRAME_TEMPLATE_TYPES) {
      for (const child of buildFrameTemplate(type, ctx).elements ?? []) {
        expect(isBoxPart(child)).toBe(true);
      }
    }
  });

  test('the mark survives export and re-import', () => {
    const card = withUuid(buildFrameTemplate('frameKpiCard', ctx));
    const xml = generateJRXMLContent(properties, [{ type: 'detail', height: 200, elements: [card] }], []);
    const frame = parseJRXMLContent(xml).bands.find((b) => b.type === 'detail')!.elements[0] as FrameElement;
    expect(frame.elements!.every(isBoxPart)).toBe(true);
  });

  test('"Add to box" and "Move out of box" toggle the mark, keeping other properties', () => {
    const item: any = { properties: [{ name: 'com.cdp.image.name', value: 'logo.png' }] };
    markBoxPart(item);
    markBoxPart(item);
    expect(item.properties).toHaveLength(2);
    expect(isBoxPart(item)).toBe(true);
    releaseBoxPart(item);
    expect(item.properties).toEqual([{ name: 'com.cdp.image.name', value: 'logo.png' }]);
  });

  test('moving a part out of its box makes it an ordinary item', () => {
    const part = buildFrameTemplate('frameKpiCard', ctx).elements![0]! as any;
    releaseBoxPart(part);
    expect(isBoxPart(part)).toBe(false);
    expect(part.properties).toBeUndefined();
  });
});
