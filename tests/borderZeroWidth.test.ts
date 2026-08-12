// Test whether the border correctly displays as none when lineWidth is 0
import { describe, it, expect } from 'vitest';

// Mock implementation of the getBorderStyle function
const getBorderStyle = (side: string, box?: any): string | undefined => {
  if (!box) return 'none';

  // Prefer the sidePen element (per the XSD definition, this is the recommended approach)
  const penProperty = side === 'top' ? box.topPen :
                    side === 'left' ? box.leftPen :
                    side === 'bottom' ? box.bottomPen :
                    box.rightPen;

  // Get the border style and width for each side
  const sideBorderStyle = side === 'top' ? box.topBorderStyle :
                         side === 'left' ? box.leftBorderStyle :
                         side === 'bottom' ? box.bottomBorderStyle :
                         box.rightBorderStyle;

  const sideBorderWidth = side === 'top' ? box.topBorderWidth :
                         side === 'left' ? box.leftBorderWidth :
                         side === 'bottom' ? box.bottomBorderWidth :
                         box.rightBorderWidth;

  // Next consider the deprecated sideBorder attribute
  const borderProperty = side === 'top' ? box.topBorder :
                     side === 'left' ? box.leftBorder :
                     side === 'bottom' ? box.bottomBorder :
                     box.rightBorder;

  // If sideBorder is present and is already a complete CSS border string, return it directly
  if (borderProperty && borderProperty.includes(' ')) {
    return borderProperty;
  }

  // If sideBorder is an empty string, return none
  if (borderProperty === '') {
    return 'none';
  }

  // If there is neither sidePen nor sideBorder, check the global pen or border
  // Only apply a border when the border property exists and is not an empty string
  if (!penProperty && !borderProperty && (!box.pen || box.pen === '') && (!box.border || box.border === '')) return 'none';

  // Get the border color - prefer sidePen's lineColor, then the global pen's lineColor, then the deprecated color property
  const colorProperty = side === 'top' ? box.topBorderColor :
                     side === 'left' ? box.leftBorderColor :
                     side === 'bottom' ? box.bottomBorderColor :
                     box.rightBorderColor;
  const color = penProperty?.lineColor || box.pen?.lineColor || colorProperty || box.borderColor;

  // Get the line width - prefer the new border-width property
  let hasWidth = false;
  let width = '1px'; // default width

  if (penProperty?.lineWidth !== undefined) {
    width = `${penProperty.lineWidth}px`;
    // Only mark as having a width when the line width is greater than 0
    hasWidth = penProperty.lineWidth > 0;
  } else if (sideBorderWidth !== undefined) {
    width = `${sideBorderWidth}px`;
    // Only mark as having a width when the line width is greater than 0
    hasWidth = sideBorderWidth > 0;
  } else if (box.borderWidth !== undefined) {
    width = `${box.borderWidth}px`;
    // Only mark as having a width when the line width is greater than 0
    hasWidth = box.borderWidth > 0;
  } else if (borderProperty === 'Thin' || borderProperty === '1Point') {
    width = '1px';
    hasWidth = true;
  } else if (borderProperty === '2Point' || borderProperty === 'Medium') {
    width = '2px';
    hasWidth = true;
  } else if (borderProperty === '4Point' || borderProperty === 'Thick') {
    width = '4px';
    hasWidth = true;
  }

  // Get the line style - prefer the new border-style property
  let hasStyle = false;
  let style = 'solid'; // default solid line

  if (penProperty?.lineStyle) {
    if (penProperty.lineStyle === 'Dashed') style = 'dashed';
    else if (penProperty.lineStyle === 'Dotted') style = 'dotted';
    else if (penProperty.lineStyle === 'Double') style = 'double';
    hasStyle = true;
  } else if (sideBorderStyle) {
    if (sideBorderStyle === 'Dashed') style = 'dashed';
    else if (sideBorderStyle === 'Dotted') style = 'dotted';
    else if (sideBorderStyle === 'Double') style = 'double';
    hasStyle = true;
  } else if (box.borderStyle) {
    if (box.borderStyle === 'Dashed') style = 'dashed';
    else if (box.borderStyle === 'Dotted') style = 'dotted';
    else if (box.borderStyle === 'Double') style = 'double';
    hasStyle = true;
  } else if (borderProperty === 'Dashed') {
    style = 'dashed';
    hasStyle = true;
  } else if (borderProperty === 'Dotted') {
    style = 'dotted';
    hasStyle = true;
  } else if (borderProperty === 'Double') {
    style = 'double';
    hasStyle = true;
  }

  // Only show the border if at least one of color, width, or style is set
  // In particular, if no width is set (line width is 0 or unset), don't show the border
  if (!color && !hasWidth && !hasStyle) return 'none';

  // If no width is set (line width is 0), don't show the border even if there's a color or style
  if (!hasWidth) return 'none';

  // If no color is set, use transparent
  const finalColor = color || 'transparent';

  return `${width} ${style} ${finalColor}`;
};

describe('Border display test when line width is 0', () => {
  it('when topPen lineWidth is 0, the top border should not be shown', () => {
    const box = {
      topPen: {
        lineWidth: 0,
        lineStyle: 'Solid',
        lineColor: '#000000'
      }
    };

    const topBorder = getBorderStyle('top', box);
    expect(topBorder).toBe('none');
  });

  it('when leftPen lineWidth is 0, the left border should not be shown', () => {
    const box = {
      leftPen: {
        lineWidth: 0,
        lineStyle: 'Solid',
        lineColor: '#000000'
      }
    };

    const leftBorder = getBorderStyle('left', box);
    expect(leftBorder).toBe('none');
  });

  it('when bottomPen lineWidth is 0, the bottom border should not be shown', () => {
    const box = {
      bottomPen: {
        lineWidth: 0,
        lineStyle: 'Solid',
        lineColor: '#000000'
      }
    };

    const bottomBorder = getBorderStyle('bottom', box);
    expect(bottomBorder).toBe('none');
  });

  it('when rightPen lineWidth is 0, the right border should not be shown', () => {
    const box = {
      rightPen: {
        lineWidth: 0,
        lineStyle: 'Solid',
        lineColor: '#000000'
      }
    };

    const rightBorder = getBorderStyle('right', box);
    expect(rightBorder).toBe('none');
  });

  it('when lineWidth is 0 on every side, no borders should be shown', () => {
    const box = {
      topPen: { lineWidth: 0, lineStyle: 'Solid', lineColor: '#000000' },
      leftPen: { lineWidth: 0, lineStyle: 'Solid', lineColor: '#000000' },
      bottomPen: { lineWidth: 0, lineStyle: 'Solid', lineColor: '#000000' },
      rightPen: { lineWidth: 0, lineStyle: 'Solid', lineColor: '#000000' }
    };

    const topBorder = getBorderStyle('top', box);
    const leftBorder = getBorderStyle('left', box);
    const bottomBorder = getBorderStyle('bottom', box);
    const rightBorder = getBorderStyle('right', box);

    expect(topBorder).toBe('none');
    expect(leftBorder).toBe('none');
    expect(bottomBorder).toBe('none');
    expect(rightBorder).toBe('none');
  });

  it('when lineWidth is greater than 0, the border should display normally', () => {
    const box = {
      topPen: {
        lineWidth: 1,
        lineStyle: 'Solid',
        lineColor: '#000000'
      }
    };

    const topBorder = getBorderStyle('top', box);
    expect(topBorder).toBe('1px solid #000000');
  });
});
