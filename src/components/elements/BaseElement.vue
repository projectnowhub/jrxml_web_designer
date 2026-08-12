<template>
  <div 
    class="design-element"
    :class="{ 
      'selected': isSelected,
      'out-of-bounds': isOutOfBounds
    }"
    @click.stop="handleSelect"
    :style="elementStyle"
    @mousedown.stop="handleMouseDown"
    @contextmenu.stop="handleContextMenu"
    @dblclick.stop="handleDoubleClick"
  >
    <!-- Child components will override this content -->
    <slot></slot>

    <!-- Resize handle -->
    <div 
      v-if="isSelected"
      class="resize-handle resize-handle-se"
      @mousedown.stop="(event) => handleResize('se', event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DesignElement, SelectedElementInfo } from '../../types';

// Props
const props = defineProps<{
  element: DesignElement;
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: {bandIndex: number, elementIndex: number, parentFrameIndex?: number, uuid?: string}[]; // Add multi-select support
  isDragging?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  isOutOfBounds?: boolean;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Whether selected
const isSelected = computed(() => {
  // 1. Prefer comparing by UUID (most accurate)
  if (props.element.uuid) {
    // Check multi-select
    if (props.selectedElements && props.selectedElements.length > 0) {
      return props.selectedElements.some(el => el.uuid === props.element.uuid);
    }
    // Check single select
    if (props.selectedElement && props.selectedElement.uuid) {
      return props.selectedElement.uuid === props.element.uuid;
    }
  }

  // 2. Fall back to index comparison (helper: treat undefined as -1 for comparison)
  const getPFI = (pfi: number | undefined) => pfi === undefined ? -1 : pfi;
  const currentPFI = getPFI(props.parentFrameIndex);

  // Check whether it's in the multi-select list
  if (props.selectedElements && props.selectedElements.length > 0) {
    return props.selectedElements.some(
      el => el.bandIndex === props.bandIndex &&
            el.elementIndex === props.elementIndex &&
            getPFI(el.parentFrameIndex) === currentPFI
    );
  }

  // Single select logic
  return props.selectedElement &&
         props.selectedElement.bandIndex === props.bandIndex && 
         props.selectedElement.elementIndex === props.elementIndex &&
         getPFI(props.selectedElement.parentFrameIndex) === currentPFI;
});

// Element style - use a more suitable type assertion approach
const elementStyle = computed(() => {
  // Compute values for complex expressions separately and add type assertions
  // Fix the vertical alignment value mapping
  let verticalAlign = 'flex-start'; // Default value
  if (props.element.verticalAlignment) {
    switch (props.element.verticalAlignment) {
      case 'Top':
        verticalAlign = 'flex-start';
        break;
      case 'Middle':
        verticalAlign = 'center';
        break;
      case 'Bottom':
        verticalAlign = 'flex-end';
        break;
      default:
        verticalAlign = 'flex-start';
    }
  }
  
  const justifyContent = props.element.textAlignment === 'Justified' ? 'space-between' : (props.element.textAlignment?.toLowerCase() || 'flex-start');
  const textAlign = props.element.textAlignment === 'Justified' ? 'justify' : (props.element.textAlignment?.toLowerCase() || 'left');
  
  // Compute the border style
  const calculateBorder = (side: string): string => {
    // Prefer the getBorderStyle function, which already contains the full border handling logic
    const borderStyle = getBorderStyle(side, props.element.box);
    if (borderStyle && borderStyle !== 'none') {
      return borderStyle;
    }

    // If getBorderStyle returns none, return none
    return 'none';
  };

  // Assert the entire object as CSSProperties
  return {
    position: 'absolute' as 'absolute',
    left: `${props.element.x}px`,
    top: `${props.element.y}px`,
    width: `${props.element.width}px`,
    height: `${props.element.height}px`,
    backgroundColor: (props.element.mode === 'Opaque' && props.element.backcolor) ? props.element.backcolor : 'transparent',
    color: props.element.type !== 'table' ? props.element.forecolor : undefined,
    paddingTop: props.element.box?.topPadding ? `${props.element.box.topPadding}px` : (props.element.box?.padding ? `${props.element.box.padding}px` : undefined),
    paddingLeft: props.element.box?.leftPadding ? `${props.element.box.leftPadding}px` : (props.element.box?.padding ? `${props.element.box.padding}px` : undefined),
    paddingBottom: props.element.box?.bottomPadding ? `${props.element.box.bottomPadding}px` : (props.element.box?.padding ? `${props.element.box.padding}px` : undefined),
    paddingRight: props.element.box?.rightPadding ? `${props.element.box.rightPadding}px` : (props.element.box?.padding ? `${props.element.box.padding}px` : undefined),
    borderTop: calculateBorder('top'),
    borderLeft: calculateBorder('left'),
    borderBottom: calculateBorder('bottom'),
    borderRight: calculateBorder('right'),
    borderRadius: props.element.type === 'ellipse' ? '50%' : ((props.element.type === 'rectangle' && (props.element as any).radius) ? `${(props.element as any).radius}px` : undefined),
    fontFamily: props.element.fontFamily || props.reportFontFamily,
    fontSize: props.element.fontSize ? `${props.element.fontSize}px` : (props.reportFontSize ? `${props.reportFontSize}px` : '10px'),
    fontWeight: (props.element.isBold === true || (props.element.isBold === undefined && props.reportIsBold)) ? 'bold' : 'normal',
    fontStyle: (props.element.isItalic === true || (props.element.isItalic === undefined && props.reportIsItalic)) ? 'italic' : 'normal',
    textDecoration: (props.element.isUnderline === true || (props.element.isUnderline === undefined && props.reportIsUnderline)) ? 'underline' : 'none',
    display: 'flex' as 'flex',
    alignItems: verticalAlign as any,
    justifyContent: justifyContent as any,
    textAlign: textAlign as any
  } as any;
});

// Get the border style
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

  // Next, consider the deprecated sideBorder property
  const borderProperty = side === 'top' ? box.topBorder :
                     side === 'left' ? box.leftBorder :
                     side === 'bottom' ? box.bottomBorder :
                     box.rightBorder;

  // If the sideBorder property is present and is already a complete CSS border string, return it directly
  if (borderProperty && borderProperty.includes(' ')) {
    return borderProperty;
  }

  // If there's neither sidePen nor sideBorder, check the global pen or border
  // Check whether a global border setting exists
  const hasGlobalBorder = (box.pen && box.pen.lineWidth && box.pen.lineWidth > 0) || 
                          (box.borderWidth && box.borderWidth > 0) ||
                          (box.border && box.border !== '');
  
  // If no border setting exists at all, return none
  if (!penProperty && !borderProperty && !hasGlobalBorder) return 'none';

  // Get the border color - prefer sidePen's lineColor, then the global pen's lineColor, then the deprecated color property
  const colorProperty = side === 'top' ? box.topBorderColor :
                     side === 'left' ? box.leftBorderColor :
                     side === 'bottom' ? box.bottomBorderColor :
                     box.rightBorderColor;
  const color = penProperty?.lineColor || box.pen?.lineColor || colorProperty || box.borderColor;

  // Get the line width - prefer the new border width property
  let hasWidth = false;
  let width = '1px'; // Default width

  // Prefer sidePen's lineWidth property
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
  } else if (box.pen?.lineWidth !== undefined) {
    // If there's no sidePen but there is a global pen, use the global pen's lineWidth
    width = `${box.pen.lineWidth}px`;
    hasWidth = box.pen.lineWidth > 0;
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

  // Get the line style - prefer the new border style property
  let hasStyle = false;
  let style = 'solid'; // Default to solid line

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
  } else if (box.pen?.lineStyle) {
    // If there's no sidePen but there is a global pen, use the global pen's lineStyle
    if (box.pen.lineStyle === 'Dashed') style = 'dashed';
    else if (box.pen.lineStyle === 'Dotted') style = 'dotted';
    else if (box.pen.lineStyle === 'Double') style = 'double';
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

  // Only show the border when at least one of color, width, or style is set
  // In particular, if no width is set (line width is 0 or unset), the border is not shown
  if (!color && !hasWidth && !hasStyle) return 'none';

  // If no width is set (line width is 0), don't show the border, even if there is a color or style
  if (!hasWidth) return 'none';

  // If no color is set, use transparent
  const finalColor = color || 'transparent';

  return `${width} ${style} ${finalColor}`;
};

// Handle selection
const handleSelect = (event: MouseEvent) => {
  // Check whether the Ctrl or Shift key is held (multi-select)
  const isMultiSelect = event.ctrlKey || event.shiftKey || event.metaKey;
  emit('select', props.bandIndex, props.elementIndex, isMultiSelect, props.parentFrameIndex);
};

// Handle mouse down (drag)
const handleMouseDown = (event: MouseEvent) => {
  // Only allow the left button to trigger dragging
  if (event.button !== 0) {
    return;
  }

  // Record the initial position and time of the mouse down
  const startX = event.clientX;
  const startY = event.clientY;
  const startTime = Date.now();

  // Dragging state flag
  let isDragging = false;
  let dragTimer: number | null = null;

  // Mouse move handler
  const handleMouseMove = (moveEvent: MouseEvent) => {
    // Compute the movement distance
    const deltaX = Math.abs(moveEvent.clientX - startX);
    const deltaY = Math.abs(moveEvent.clientY - startY);

    // Only allow dragging once the mouse has been held down for more than 100ms
    const elapsed = Date.now() - startTime;

    if (elapsed > 100 && (deltaX > 5 || deltaY > 5)) {
      if (!isDragging) {
        isDragging = true;
        // Emit the drag start event
        emit('dragStart', moveEvent, props.bandIndex, props.elementIndex, props.parentFrameIndex);
      }
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    // Clear the timer (if any)
    if (dragTimer !== null) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }

    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Handle resize
const handleResize = (_direction: string, event?: MouseEvent) => {
  // Get the current event object
  const resizeEvent = event || window.event as MouseEvent;
  if (resizeEvent && resizeEvent.button === 0) {
    emit('resizeStart', resizeEvent, props.bandIndex, props.elementIndex, props.parentFrameIndex);
  }
};

// Handle context menu
const handleContextMenu = (event: MouseEvent) => {
  emit('contextmenu', event, props.bandIndex, props.elementIndex, props.parentFrameIndex);
};

// Handle double-click
const handleDoubleClick = () => {
  emit('startEditing', props.bandIndex, props.elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.design-element {
  user-select: none;
  cursor: move;
  position: relative;
  box-sizing: border-box;
  z-index: 1;
  /* Add a small click-area extension to improve selection accuracy */
  transform-origin: center;
  transition: outline 0.1s ease;
  /* Add text wrapping style */
  word-break: break-all;
}

.design-element.selected {
  outline: 2px solid #1890ff;
  outline-offset: -1px;
  /* Raise the z-index of the selected element to ensure correct interaction */
  z-index: 10;
}

.design-element.out-of-bounds {
  /* Highlight style for out-of-bounds elements */
  outline: 2px dashed #ff4d4f;
  outline-offset: -1px;
  background-color: rgba(255, 77, 79, 0.1);
  box-shadow: 0 0 5px rgba(255, 77, 79, 0.5);
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  background-color: #1890ff;
  cursor: se-resize;
  z-index: 20;
}
</style>