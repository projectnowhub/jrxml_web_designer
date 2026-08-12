// Panel-operation-related utility functions

import { PANEL_CONSTANTS } from '@/constants/constants';

// Adjust the bottom panel height
export function adjustBottomPanelHeight(
  currentHeight: number,
  deltaY: number,
  minHeight?: number,
  maxHeight?: number
): number {
  const newHeight = currentHeight + deltaY;
  const minH = minHeight || PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT;
  const maxH = maxHeight || 800; // default maximum height

  return Math.max(minH, Math.min(newHeight, maxH));
}

// Adjust the left panel width
export function adjustLeftPanelWidth(
  currentWidth: number,
  deltaX: number,
  minWidth?: number,
  maxWidth?: number
): number {
  const newWidth = currentWidth + deltaX;
  const minW = minWidth || PANEL_CONSTANTS.LEFT_PANEL_MIN_WIDTH;
  const maxW = maxWidth || PANEL_CONSTANTS.LEFT_PANEL_MAX_WIDTH;
  
  return Math.max(minW, Math.min(newWidth, maxW));
}

// Adjust the property panel width
export function adjustPropertyPanelWidth(
  currentWidth: number,
  deltaX: number,
  minWidth?: number,
  maxWidth?: number
): number {
  const newWidth = currentWidth - deltaX; // The property panel is on the right, so the direction is reversed
  const minW = minWidth || 200;
  const maxW = maxWidth || 600;

  return Math.max(minW, Math.min(newWidth, maxW));
}

// Check whether a point is within the resize area
export function isInResizeArea(
  x: number,
  y: number,
  areaType: 'bottom' | 'left' | 'right',
  containerRect: DOMRect,
  threshold: number = 10
): boolean {
  switch (areaType) {
    case 'bottom':
      return y >= containerRect.bottom - threshold && y <= containerRect.bottom;
    case 'left':
      return x >= containerRect.left && x <= containerRect.left + threshold;
    case 'right':
      return x >= containerRect.right - threshold && x <= containerRect.right;
    default:
      return false;
  }
}

// Get the mouse cursor style
export function getResizeCursor(areaType: 'bottom' | 'left' | 'right'): string {
  switch (areaType) {
    case 'bottom':
      return 'ns-resize';
    case 'left':
      return 'ew-resize';
    case 'right':
      return 'ew-resize';
    default:
      return 'default';
  }
}

// Panel state management
export interface PanelState {
  leftPanelWidth: number;
  bottomPanelHeight: number;
  propertyPanelWidth: number;
  leftPanelCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  propertyPanelCollapsed: boolean;
}

// Get the default panel state
export function getDefaultPanelState(): PanelState {
  return {
    leftPanelWidth: PANEL_CONSTANTS.DEFAULT_LEFT_PANEL_WIDTH,
    bottomPanelHeight: PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT,
    propertyPanelWidth: PANEL_CONSTANTS.DEFAULT_PROPERTY_PANEL_WIDTH,
    leftPanelCollapsed: false,
    bottomPanelCollapsed: false,
    propertyPanelCollapsed: false,
  };
}

// Toggle the panel's collapsed state
export function togglePanelCollapsed(
  currentState: PanelState,
  panelType: 'left' | 'bottom' | 'property'
): PanelState {
  const newState = { ...currentState };
  
  switch (panelType) {
    case 'left':
      newState.leftPanelCollapsed = !currentState.leftPanelCollapsed;
      break;
    case 'bottom':
      newState.bottomPanelCollapsed = !currentState.bottomPanelCollapsed;
      break;
    case 'property':
      newState.propertyPanelCollapsed = !currentState.propertyPanelCollapsed;
      break;
  }
  
  return newState;
}

// Save panel state to local storage
export function savePanelState(panelState: PanelState): void {
  try {
    localStorage.setItem('pdf_designer_panel_state', JSON.stringify(panelState));
  } catch (error) {
    console.error('Failed to save panel state:', error);
  }
}

// Load panel state from local storage
export function loadPanelState(): PanelState | null {
  try {
    const stateStr = localStorage.getItem('pdf_designer_panel_state');
    if (stateStr) {
      return JSON.parse(stateStr) as PanelState;
    }
  } catch (error) {
    console.error('Failed to load panel state:', error);
  }
  return null;
}

// Calculate the visible panel width
export function getPanelVisibleWidth(
  panelWidth: number,
  isCollapsed: boolean
): number {
  return isCollapsed ? 0 : panelWidth;
}

// Calculate the visible panel height
export function getPanelVisibleHeight(
  panelHeight: number,
  isCollapsed: boolean
): number {
  return isCollapsed ? 0 : panelHeight;
}

// Calculate the content area size
export function getContentAreaSize(
  containerWidth: number,
  containerHeight: number,
  leftPanelState: { width: number, collapsed: boolean },
  bottomPanelState: { height: number, collapsed: boolean },
  propertyPanelState: { width: number, collapsed: boolean }
): { width: number, height: number } {
  const leftPanelVisibleWidth = getPanelVisibleWidth(leftPanelState.width, leftPanelState.collapsed);
  const bottomPanelVisibleHeight = getPanelVisibleHeight(bottomPanelState.height, bottomPanelState.collapsed);
  const propertyPanelVisibleWidth = getPanelVisibleWidth(propertyPanelState.width, propertyPanelState.collapsed);
  
  return {
    width: containerWidth - leftPanelVisibleWidth - propertyPanelVisibleWidth,
    height: containerHeight - bottomPanelVisibleHeight,
  };
}