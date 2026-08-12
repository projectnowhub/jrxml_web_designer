import { ref, computed, watch } from 'vue';

export interface BoundaryConfig {
  // Detection mode
  realtime: boolean;
  onDrop: boolean;
  onResize: boolean;
  // Detection behavior
  autoCorrect: boolean;
  showWarning: boolean;
  preventOutOfBounds: boolean;
  suggestFix: boolean;
  // Visual feedback
  highlightOutOfBounds: boolean;
  showBoundaryLines: boolean;
  animateCorrection: boolean;
  // Boundary tolerance
  tolerance: number;
}

export interface BoundaryViolation {
  id: string;
  elementId: string;
  bandIndex: number;
  elementIndex: number;
  type: 'left' | 'right' | 'top' | 'bottom';
  severity: 'warning' | 'error';
  currentValue: number;
  boundaryValue: number;
  overflow: number;
  suggestion: BoundaryFix;
}

export interface BoundaryFix {
  action: 'move' | 'resize' | 'both';
  newX?: number;
  newY?: number;
  newWidth?: number;
  newHeight?: number;
  description: string;
}

export interface BoundaryState {
  // List of out-of-bounds elements
  outOfBoundsElements: BoundaryViolation[];
  // Whether to show boundary lines
  showBoundaryLines: boolean;
  // Boundary line positions
  boundaryLines: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  // Whether a check is in progress
  isChecking: boolean;
}

export function useBoundaryDetection(config?: Partial<BoundaryConfig>) {
  // Config
  const boundaryConfig = ref<BoundaryConfig>({
    realtime: true,
    onDrop: true,
    onResize: true,
    autoCorrect: false,
    showWarning: true,
    preventOutOfBounds: false,
    suggestFix: true,
    highlightOutOfBounds: true,
    showBoundaryLines: true,
    animateCorrection: true,
    tolerance: 5,
    ...config,
  });

  // State
  const boundaryState = ref<BoundaryState>({
    outOfBoundsElements: [],
    showBoundaryLines: false,
    boundaryLines: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    isChecking: false,
  });

  // Computed: whether there are any out-of-bounds elements
  const hasOutOfBoundsElements = computed(() =>
    boundaryState.value.outOfBoundsElements.length > 0
  );

  // Computed: number of out-of-bounds elements
  const outOfBoundsCount = computed(() =>
    boundaryState.value.outOfBoundsElements.length
  );

  // Computed: number of critically out-of-bounds elements
  const criticalOutOfBoundsCount = computed(() =>
    boundaryState.value.outOfBoundsElements.filter(v => v.severity === 'error').length
  );

  // Check whether an element is out of bounds
  const checkElementBounds = (
    element: { x: number; y: number; width: number; height: number },
    bounds: { left: number; right: number; top: number; bottom: number },
    elementId: string,
    bandIndex: number,
    elementIndex: number
  ): BoundaryViolation[] => {
    const violations: BoundaryViolation[] = [];
    const tolerance = boundaryConfig.value.tolerance;

    // Check the left boundary
    if (element.x < bounds.left - tolerance) {
      violations.push({
        id: `${elementId}-left`,
        elementId,
        bandIndex,
        elementIndex,
        type: 'left',
        severity: element.x < bounds.left ? 'error' : 'warning',
        currentValue: element.x,
        boundaryValue: bounds.left,
        overflow: bounds.left - element.x,
        suggestion: {
          action: 'move',
          newX: bounds.left,
          description: 'Move the element right',
        },
      });
    }

    // Check the right boundary
    if (element.x + element.width > bounds.right + tolerance) {
      violations.push({
        id: `${elementId}-right`,
        elementId,
        bandIndex,
        elementIndex,
        type: 'right',
        severity: element.x + element.width > bounds.right ? 'error' : 'warning',
        currentValue: element.x + element.width,
        boundaryValue: bounds.right,
        overflow: (element.x + element.width) - bounds.right,
        suggestion: {
          action: 'move',
          newX: bounds.right - element.width,
          description: 'Move the element left',
        },
      });
    }

    // Check the top boundary
    if (element.y < bounds.top - tolerance) {
      violations.push({
        id: `${elementId}-top`,
        elementId,
        bandIndex,
        elementIndex,
        type: 'top',
        severity: element.y < bounds.top ? 'error' : 'warning',
        currentValue: element.y,
        boundaryValue: bounds.top,
        overflow: bounds.top - element.y,
        suggestion: {
          action: 'move',
          newY: bounds.top,
          description: 'Move the element down',
        },
      });
    }

    // Check the bottom boundary
    if (element.y + element.height > bounds.bottom + tolerance) {
      violations.push({
        id: `${elementId}-bottom`,
        elementId,
        bandIndex,
        elementIndex,
        type: 'bottom',
        severity: element.y + element.height > bounds.bottom ? 'error' : 'warning',
        currentValue: element.y + element.height,
        boundaryValue: bounds.bottom,
        overflow: (element.y + element.height) - bounds.bottom,
        suggestion: {
          action: 'move',
          newY: bounds.bottom - element.height,
          description: 'Move the element up',
        },
      });
    }

    return violations;
  };

  // Check all elements
  const checkAllElements = (
    bands: Array<{
      type: string;
      height: number;
      elements: Array<{
        uuid?: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    }>,
    paperWidth: number,
    reportProperties: { leftMargin: number; rightMargin: number; topMargin: number; bottomMargin: number }
  ) => {
    boundaryState.value.isChecking = true;

    const allViolations: BoundaryViolation[] = [];
    const contentWidth = paperWidth - reportProperties.leftMargin - reportProperties.rightMargin;

    let yOffset = reportProperties.topMargin;

    bands.forEach((band, bandIndex) => {
      const bandBounds = {
        left: 0,
        right: contentWidth,
        top: 0,
        bottom: band.height,
      };

      band.elements.forEach((element, elementIndex) => {
        const elementId = element.uuid || `element-${bandIndex}-${elementIndex}`;
        const violations = checkElementBounds(
          element,
          bandBounds,
          elementId,
          bandIndex,
          elementIndex
        );

        allViolations.push(...violations);
      });

      yOffset += band.height;
    });

    boundaryState.value.outOfBoundsElements = allViolations;
    boundaryState.value.isChecking = false;

    return allViolations;
  };

  // Check a single element
  const checkSingleElement = (
    element: { x: number; y: number; width: number; height: number },
    bandHeight: number,
    contentWidth: number,
    elementId: string,
    bandIndex: number,
    elementIndex: number
  ) => {
    const bandBounds = {
      left: 0,
      right: contentWidth,
      top: 0,
      bottom: bandHeight,
    };

    const violations = checkElementBounds(
      element,
      bandBounds,
      elementId,
      bandIndex,
      elementIndex
    );

    // Update the violation state for this element
    boundaryState.value.outOfBoundsElements = [
      ...boundaryState.value.outOfBoundsElements.filter(v => v.elementId !== elementId),
      ...violations,
    ];

    return violations;
  };

  // Get a fix suggestion for an element
  const getFixSuggestion = (
    element: { x: number; y: number; width: number; height: number },
    bandHeight: number,
    contentWidth: number,
    violationType: 'left' | 'right' | 'top' | 'bottom'
  ): BoundaryFix | null => {
    const bounds = {
      left: 0,
      right: contentWidth,
      top: 0,
      bottom: bandHeight,
    };

    switch (violationType) {
      case 'left':
        return {
          action: 'move',
          newX: bounds.left,
          description: 'Move inside the left boundary',
        };
      case 'right':
        return {
          action: 'move',
          newX: bounds.right - element.width,
          description: 'Move inside the right boundary',
        };
      case 'top':
        return {
          action: 'move',
          newY: bounds.top,
          description: 'Move inside the top boundary',
        };
      case 'bottom':
        return {
          action: 'move',
          newY: bounds.bottom - element.height,
          description: 'Move inside the bottom boundary',
        };
      default:
        return null;
    }
  };

  // Auto-fix an out-of-bounds element
  const autoFixElement = (
    element: { x: number; y: number; width: number; height: number },
    violations: BoundaryViolation[]
  ): { x: number; y: number; width: number; height: number } => {
    let newX = element.x;
    let newY = element.y;
    let newWidth = element.width;
    let newHeight = element.height;

    violations.forEach(violation => {
      if (violation.suggestion.action === 'move') {
        if (violation.suggestion.newX !== undefined) {
          newX = violation.suggestion.newX;
        }
        if (violation.suggestion.newY !== undefined) {
          newY = violation.suggestion.newY;
        }
      } else if (violation.suggestion.action === 'resize') {
        if (violation.suggestion.newWidth !== undefined) {
          newWidth = violation.suggestion.newWidth;
        }
        if (violation.suggestion.newHeight !== undefined) {
          newHeight = violation.suggestion.newHeight;
        }
      }
    });

    return { x: newX, y: newY, width: newWidth, height: newHeight };
  };

  // Batch-fix all out-of-bounds elements
  const autoFixAllElements = (
    bands: Array<{
      type: string;
      height: number;
      elements: Array<{
        uuid?: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    }>,
    paperWidth: number,
    reportProperties: { leftMargin: number; rightMargin: number; topMargin: number; bottomMargin: number }
  ) => {
    const contentWidth = paperWidth - reportProperties.leftMargin - reportProperties.rightMargin;

    const fixedBands = bands.map((band, bandIndex) => ({
      ...band,
      elements: band.elements.map((element, elementIndex) => {
        const elementId = element.uuid || `element-${bandIndex}-${elementIndex}`;
        const violations = boundaryState.value.outOfBoundsElements.filter(
          v => v.elementId === elementId
        );

        if (violations.length > 0) {
          return autoFixElement(element, violations);
        }

        return element;
      }),
    }));

    // Clear the fixed violations
    boundaryState.value.outOfBoundsElements = [];

    return fixedBands;
  };

  // Highlight an out-of-bounds element
  const highlightElement = (elementId: string) => {
    const element = document.querySelector(`[data-element-id="${elementId}"]`);
    if (element) {
      element.classList.add('out-of-bounds-highlight');
      setTimeout(() => {
        element.classList.remove('out-of-bounds-highlight');
      }, 2000);
    }
  };

  // Show boundary lines
  const showBoundaryLines = (
    paperWidth: number,
    reportProperties: { leftMargin: number; rightMargin: number; topMargin: number; bottomMargin: number }
  ) => {
    const contentWidth = paperWidth - reportProperties.leftMargin - reportProperties.rightMargin;

    boundaryState.value.showBoundaryLines = true;
    boundaryState.value.boundaryLines = {
      left: 0,
      right: contentWidth,
      top: 0,
      bottom: 0, // Needs to be calculated based on the actual band height
    };
  };

  // Hide boundary lines
  const hideBoundaryLines = () => {
    boundaryState.value.showBoundaryLines = false;
  };

  // Clear all recorded violations
  const clearViolations = () => {
    boundaryState.value.outOfBoundsElements = [];
  };

  // Get a violation summary
  const getViolationSummary = computed(() => {
    const violations = boundaryState.value.outOfBoundsElements;
    if (violations.length === 0) return null;

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    return {
      total: violations.length,
      errors: errorCount,
      warnings: warningCount,
      message: errorCount > 0
        ? `${errorCount} element(s) are critically out of bounds, ${warningCount} slightly out of bounds`
        : `${warningCount} element(s) are slightly out of bounds`,
    };
  });

  // Update the config
  const updateConfig = (newConfig: Partial<BoundaryConfig>) => {
    boundaryConfig.value = { ...boundaryConfig.value, ...newConfig };
  };

  return {
    boundaryConfig,
    boundaryState,
    hasOutOfBoundsElements,
    outOfBoundsCount,
    criticalOutOfBoundsCount,
    checkElementBounds,
    checkAllElements,
    checkSingleElement,
    getFixSuggestion,
    autoFixElement,
    autoFixAllElements,
    highlightElement,
    showBoundaryLines,
    hideBoundaryLines,
    clearViolations,
    getViolationSummary,
    updateConfig,
  };
}
