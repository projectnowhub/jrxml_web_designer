/**
 * Confirm Handler - Smart confirmation mechanism
 *
 * Automatically decides whether user confirmation is required based on the operation's risk level
 */

import type { MCPToolCall } from './handlers';

// ============================================
// Type definitions
// ============================================

export type OperationRisk = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export const OperationRisk = {
  SAFE: 'safe' as const,
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const
};

export interface ConfirmRequest {
  toolName: string;
  description: string;
  riskLevel: OperationRisk;
  params: Record<string, any>;
  affectedCount?: number;
}

export interface ConfirmResponse {
  confirmed: boolean;
  reason?: string;
}

// ============================================
// Risk level mapping
// ============================================

const RISK_LEVELS: Record<string, OperationRisk> = {
  // Query tools - safe
  'get_design_state': OperationRisk.SAFE,
  'get_element': OperationRisk.SAFE,
  'find_elements': OperationRisk.SAFE,

  // Create tools - low risk
  'create_static_text': OperationRisk.LOW,
  'create_text_field': OperationRisk.LOW,
  'create_rectangle': OperationRisk.LOW,
  'create_frame': OperationRisk.LOW,

  // Modify tools - low risk
  'update_element': OperationRisk.LOW,
  'move_element': OperationRisk.LOW,

  // Delete tools - medium/high risk
  'delete_element': OperationRisk.MEDIUM,

  // Band operation tools - low risk
  'update_band_height': OperationRisk.LOW
};

// ============================================
// Smart confirmation logic
// ============================================

/**
 * Get the risk level of an operation
 */
export function getOperationRisk(toolName: string): OperationRisk {
  return (RISK_LEVELS as Record<string, OperationRisk>)[toolName] || OperationRisk.HIGH;
}

/**
 * Check whether user confirmation is required
 */
export function shouldConfirm(toolCall: MCPToolCall): boolean {
  const riskLevel = getOperationRisk(toolCall.name);

  // Safe operations don't require confirmation
  if (riskLevel === OperationRisk.SAFE) {
    return false;
  }

  // Low-risk operations don't require confirmation
  if (riskLevel === OperationRisk.LOW) {
    return false;
  }

  // Medium risk - batch operations require confirmation
  if (riskLevel === OperationRisk.MEDIUM) {
    // If more than 3 elements are involved, confirmation is required
    if (toolCall.params.uuids && Array.isArray(toolCall.params.uuids)) {
      return toolCall.params.uuids.length > 3;
    }
    // A single delete operation requires confirmation
    if (toolCall.name === 'delete_element') {
      return true;
    }
    return false;
  }

  // High and critical risk - confirmation is mandatory
  if (riskLevel === OperationRisk.HIGH || riskLevel === OperationRisk.CRITICAL) {
    return true;
  }

  return true;
}

/**
 * Generate a confirmation request
 */
export function generateConfirmRequest(toolCall: MCPToolCall): ConfirmRequest {
  const riskLevel = getOperationRisk(toolCall.name);
  const description = generateToolDescription(toolCall);

  let affectedCount: number | undefined;

  // Compute the number of affected elements
  if (toolCall.params.uuids && Array.isArray(toolCall.params.uuids)) {
    affectedCount = toolCall.params.uuids.length;
  }

  return {
    toolName: toolCall.name,
    description,
    riskLevel,
    params: toolCall.params,
    affectedCount
  };
}

/**
 * Generate a description of the tool operation
 */
function generateToolDescription(toolCall: MCPToolCall): string {
  const { name, params } = toolCall;

  switch (name) {
    case 'create_static_text':
      return `Create static text "${params.text || 'unnamed'}" in the ${params.bandType} band`;

    case 'create_text_field':
      return `Create a dynamic text field "${params.expression || 'undefined'}" in the ${params.bandType} band`;

    case 'create_rectangle':
      return `Create a rectangle in the ${params.bandType} band`;

    case 'create_frame':
      return `Create a Frame container in the ${params.bandType} band`;

    case 'update_element':
      return `Update element ${params.uuid} properties: ${Object.keys(params.properties || {}).join(', ')}`;

    case 'move_element':
      return `Move element ${params.uuid} to position (${params.x}, ${params.y})`;

    case 'delete_element':
      return `Delete element ${params.uuid}`;

    case 'update_band_height':
      return `Adjust the ${params.bandType} band height to ${params.height}px`;

    default:
      return `Execute tool ${name}`;
  }
}

/**
 * Get a description of the risk level
 */
export function getRiskLevelDescription(riskLevel: OperationRisk): string {
  switch (riskLevel) {
    case OperationRisk.SAFE:
      return 'Safe operation - read-only';
    case OperationRisk.LOW:
      return 'Low risk - single element modification';
    case OperationRisk.MEDIUM:
      return 'Medium risk - multiple element modification or deletion';
    case OperationRisk.HIGH:
      return 'High risk - batch deletion or an irreversible operation';
    case OperationRisk.CRITICAL:
      return 'Critical risk - requires immediate confirmation';
    default:
      return 'Unknown risk';
  }
}

/**
 * Get the risk level color (for UI display)
 */
export function getRiskLevelColor(riskLevel: OperationRisk): string {
  switch (riskLevel) {
    case OperationRisk.SAFE:
      return '#4CAF50'; // Green
    case OperationRisk.LOW:
      return '#8BC34A'; // Light green
    case OperationRisk.MEDIUM:
      return '#FFC107'; // Yellow
    case OperationRisk.HIGH:
      return '#FF9800'; // Orange
    case OperationRisk.CRITICAL:
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

// ============================================
// Confirmation dialog interface
// ============================================

export interface ConfirmDialogState {
  visible: boolean;
  request: ConfirmRequest | null;
  resolve: ((response: ConfirmResponse) => void) | null;
}

/**
 * Create confirmation dialog state management
 */
export function createConfirmDialogManager() {
  const state: ConfirmDialogState = {
    visible: false,
    request: null,
    resolve: null
  };

  /**
   * Request user confirmation
   */
  function requestConfirm(toolCall: MCPToolCall): Promise<ConfirmResponse> {
    return new Promise((resolve) => {
      const request = generateConfirmRequest(toolCall);

      // If confirmation isn't needed, pass through directly
      if (!shouldConfirm(toolCall)) {
        resolve({ confirmed: true, reason: 'Auto-approved' });
        return;
      }

      state.visible = true;
      state.request = request;
      state.resolve = resolve;
    });
  }

  /**
   * User confirms
   */
  function confirm(reason?: string) {
    if (state.resolve) {
      state.resolve({ confirmed: true, reason });
    }
    state.visible = false;
    state.request = null;
    state.resolve = null;
  }

  /**
   * User rejects
   */
  function reject(reason?: string) {
    if (state.resolve) {
      state.resolve({ confirmed: false, reason });
    }
    state.visible = false;
    state.request = null;
    state.resolve = null;
  }

  return {
    state,
    requestConfirm,
    confirm,
    reject
  };
}

// ============================================
// Tool risk level mapping table (for documentation and debugging)
// ============================================

export const TOOL_RISK_LEVELS_DOCUMENTATION = Object.entries(RISK_LEVELS).map(([toolName, riskLevel]) => ({
  toolName,
  riskLevel,
  description: getRiskLevelDescription(riskLevel),
  needsConfirmation: shouldConfirm({ name: toolName, params: {} })
}));
