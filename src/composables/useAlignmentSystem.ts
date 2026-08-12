import { ref, computed } from 'vue';

export interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  source: 'element' | 'band' | 'grid' | 'custom';
  label?: string;
  visible: boolean;
  active: boolean;
}

export interface AlignmentPoint {
  id: string;
  x: number;
  y: number;
  type: 'edge' | 'center' | 'corner';
  active: boolean;
}

export interface AlignmentResult {
  alignedX: number;
  alignedY: number;
  alignedGuides: AlignmentGuide[];
  snappedToX: boolean;
  snappedToY: boolean;
  snapStrength: number; // 0-1, snap strength
}

export function useAlignmentSystem() {
  // List of alignment guides
  const guides = ref<AlignmentGuide[]>([]);

  // List of alignment points
  const alignmentPoints = ref<AlignmentPoint[]>([]);

  // Currently active alignment guides
  const activeGuides = computed(() =>
    guides.value.filter(g => g.active && g.visible)
  );

  // Add an alignment guide
  const addGuide = (guide: Omit<AlignmentGuide, 'id' | 'visible' | 'active'>) => {
    const id = `guide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    guides.value.push({
      ...guide,
      id,
      visible: true,
      active: false,
    });
    return id;
  };

  // Remove an alignment guide
  const removeGuide = (id: string) => {
    guides.value = guides.value.filter(g => g.id !== id);
  };

  // Clear all alignment guides
  const clearGuides = () => {
    guides.value = [];
  };

  // Update an alignment guide
  const updateGuide = (id: string, updates: Partial<AlignmentGuide>) => {
    const index = guides.value.findIndex(g => g.id === id);
    if (index !== -1) {
      const existing = guides.value[index];
      if (existing) {
        guides.value[index] = { ...existing, ...updates };
      }
    }
  };

  // Activate an alignment guide
  const activateGuide = (id: string) => {
    updateGuide(id, { active: true });
  };

  // Deactivate an alignment guide
  const deactivateGuide = (id: string) => {
    updateGuide(id, { active: false });
  };

  // Deactivate all alignment guides
  const deactivateAllGuides = () => {
    guides.value = guides.value.map(g => ({ ...g, active: false }));
  };

  // Calculate the aligned position
  const calculateAlignment = (
    x: number,
    y: number,
    width: number,
    height: number,
    otherElements: Array<{ x: number; y: number; width: number; height: number }>,
    snapDistance: number = 5
  ): AlignmentResult => {
    let alignedX = x;
    let alignedY = y;
    let snappedToX = false;
    let snappedToY = false;
    let snapStrength = 0;
    const alignedGuides: AlignmentGuide[] = [];

    // Compute the edges and center of the current element
    const leftEdge = x;
    const rightEdge = x + width;
    const centerX = x + width / 2;
    const topEdge = y;
    const bottomEdge = y + height;
    const centerY = y + height / 2;

    // Check alignment against other elements
    otherElements.forEach((element, index) => {
      const elLeft = element.x;
      const elRight = element.x + element.width;
      const elCenterX = element.x + element.width / 2;
      const elTop = element.y;
      const elBottom = element.y + element.height;
      const elCenterY = element.y + element.height / 2;

      // Horizontal alignment checks (left/right edges, center)
      const horizontalChecks = [
        { value: leftEdge, target: elLeft, label: 'Align left' },
        { value: rightEdge, target: elRight, label: 'Align right' },
        { value: centerX, target: elCenterX, label: 'Center horizontally' },
      ];

      horizontalChecks.forEach(check => {
        if (Math.abs(check.value - check.target) < snapDistance) {
          alignedX = x + (check.target - check.value);
          snappedToX = true;
          snapStrength = Math.max(snapStrength, 1 - Math.abs(check.value - check.target) / snapDistance);

          // Create an alignment guide
          const guide: AlignmentGuide = {
            id: `align-h-${index}-${check.label}`,
            type: 'vertical',
            position: check.target,
            source: 'element',
            label: check.label,
            visible: true,
            active: true,
          };
          alignedGuides.push(guide);
          guides.value.push(guide);
        }
      });

      // Vertical alignment checks (top/bottom edges, center)
      const verticalChecks = [
        { value: topEdge, target: elTop, label: 'Align top' },
        { value: bottomEdge, target: elBottom, label: 'Align bottom' },
        { value: centerY, target: elCenterY, label: 'Center vertically' },
      ];

      verticalChecks.forEach(check => {
        if (Math.abs(check.value - check.target) < snapDistance) {
          alignedY = y + (check.target - check.value);
          snappedToY = true;
          snapStrength = Math.max(snapStrength, 1 - Math.abs(check.value - check.target) / snapDistance);

          // Create an alignment guide
          const guide: AlignmentGuide = {
            id: `align-v-${index}-${check.label}`,
            type: 'horizontal',
            position: check.target,
            source: 'element',
            label: check.label,
            visible: true,
            active: true,
          };
          alignedGuides.push(guide);
          guides.value.push(guide);
        }
      });
    });

    return {
      alignedX,
      alignedY,
      alignedGuides,
      snappedToX,
      snappedToY,
      snapStrength,
    };
  };

  // Calculate the spacing between elements
  const calculateSpacing = (
    elements: Array<{ x: number; y: number; width: number; height: number }>,
    direction: 'horizontal' | 'vertical'
  ): number[] => {
    if (elements.length < 2) return [];

    const spacings: number[] = [];

    if (direction === 'horizontal') {
      // Sort by X coordinate
      const sorted = [...elements].sort((a, b) => a.x - b.x);

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current && next) {
          const spacing = next.x - (current.x + current.width);
          spacings.push(spacing);
        }
      }
    } else {
      // Sort by Y coordinate
      const sorted = [...elements].sort((a, b) => a.y - b.y);

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current && next) {
          const spacing = next.y - (current.y + current.height);
          spacings.push(spacing);
        }
      }
    }

    return spacings;
  };

  // Calculate positions for even distribution
  const calculateDistribution = (
    elements: Array<{ x: number; y: number; width: number; height: number }>,
    direction: 'horizontal' | 'vertical',
    containerWidth?: number,
    containerHeight?: number
  ): Array<{ x: number; y: number }> => {
    if (elements.length < 3) {
      return elements.map(el => ({ x: el.x, y: el.y }));
    }

    const result: Array<{ x: number; y: number }> = [];

    if (direction === 'horizontal') {
      // Sort by X coordinate
      const sorted = [...elements].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      if (!first || !last) return result;

      // Compute the total width and total spacing
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const totalSpace = (containerWidth || last.x + last.width) - first.x;
      const totalGap = totalSpace - totalWidth;
      const gap = totalGap / (sorted.length - 1);

      let currentX = first.x;
      sorted.forEach((el, index) => {
        result.push({ x: currentX, y: el.y });
        currentX += el.width + gap;
      });
    } else {
      // Sort by Y coordinate
      const sorted = [...elements].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      if (!first || !last) return result;

      // Compute the total height and total spacing
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const totalSpace = (containerHeight || last.y + last.height) - first.y;
      const totalGap = totalSpace - totalHeight;
      const gap = totalGap / (sorted.length - 1);

      let currentY = first.y;
      sorted.forEach((el, index) => {
        result.push({ x: el.x, y: currentY });
        currentY += el.height + gap;
      });
    }

    return result;
  };

  // Align elements
  const alignElements = (
    elements: Array<{ x: number; y: number; width: number; height: number }>,
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ): Array<{ x: number; y: number }> => {
    if (elements.length < 2) {
      return elements.map(el => ({ x: el.x, y: el.y }));
    }

    const result: Array<{ x: number; y: number }> = [];

    if (alignment === 'left') {
      const minX = Math.min(...elements.map(el => el.x));
      elements.forEach(el => {
        result.push({ x: minX, y: el.y });
      });
    } else if (alignment === 'right') {
      const maxRight = Math.max(...elements.map(el => el.x + el.width));
      elements.forEach(el => {
        result.push({ x: maxRight - el.width, y: el.y });
      });
    } else if (alignment === 'center') {
      const minX = Math.min(...elements.map(el => el.x));
      const maxRight = Math.max(...elements.map(el => el.x + el.width));
      const centerX = (minX + maxRight) / 2;
      elements.forEach(el => {
        result.push({ x: centerX - el.width / 2, y: el.y });
      });
    } else if (alignment === 'top') {
      const minY = Math.min(...elements.map(el => el.y));
      elements.forEach(el => {
        result.push({ x: el.x, y: minY });
      });
    } else if (alignment === 'bottom') {
      const maxBottom = Math.max(...elements.map(el => el.y + el.height));
      elements.forEach(el => {
        result.push({ x: el.x, y: maxBottom - el.height });
      });
    } else if (alignment === 'middle') {
      const minY = Math.min(...elements.map(el => el.y));
      const maxBottom = Math.max(...elements.map(el => el.y + el.height));
      const centerY = (minY + maxBottom) / 2;
      elements.forEach(el => {
        result.push({ x: el.x, y: centerY - el.height / 2 });
      });
    }

    return result;
  };

  // Get the alignment tooltip text
  const getAlignmentTooltip = (alignedGuides: AlignmentGuide[]): string => {
    if (alignedGuides.length === 0) return '';

    const labels = alignedGuides.map(g => g.label).filter(Boolean);
    return labels.join(' + ');
  };

  return {
    guides,
    alignmentPoints,
    activeGuides,
    addGuide,
    removeGuide,
    clearGuides,
    updateGuide,
    activateGuide,
    deactivateGuide,
    deactivateAllGuides,
    calculateAlignment,
    calculateSpacing,
    calculateDistribution,
    alignElements,
    getAlignmentTooltip,
  };
}
