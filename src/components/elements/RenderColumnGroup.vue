<template>
    <!-- Render all group rows -->
    <template v-for="(row, rowIndex) in groupRows" :key="rowIndex">
        <!-- Only render this row when the row height is greater than 0 -->
        <template v-if="calculateRowHeight(row) > 0">
            <tr
                :class="['column-group-row', type]"
                :style="{
                    height: `${calculateRowHeight(row)}px`,
                    ...getRowStyle(type),
                }"
                @mousedown="(e) => handleRowMouseDown(e, rowIndex, row)"
            >
                <template v-for="(cell, cellIndex) in row" :key="cell.key">
                    <!-- Choose th or td based on the type -->
                    <template v-if="type === 'tableHeader'">
                        <th
                            :class="[
                                'column-group-cell',
                                { 'column-selected': isCellSelected(cell) },
                            ]"
                            :colspan="cell.colspan"
                            :rowspan="cell.rowspan"
                            :style="getCellContainerStyle(cell, type)"
                            @click="handleCellClick(cell, $event)"
                            @contextmenu.stop="
                                handleCellContextMenu(cell, $event)
                            "
                        >
                            <div
                                class="cell-content"
                                :style="getCellContentStyle(cell, type)"
                            >
                                <template v-if="cell.content.tableHeader">
                                    <template
                                        v-if="
                                            cell.content.tableHeader.element
                                                ?.type === 'staticText'
                                        "
                                    >
                                        <div class="static-text">
                                            {{
                                                cell.content.tableHeader.element
                                                    ?.text || ""
                                            }}
                                        </div>
                                    </template>
                                    <template
                                        v-else-if="
                                            cell.content.tableHeader.element
                                                ?.type === 'textField'
                                        "
                                    >
                                        <div class="text-field">
                                            {{
                                                cell.content.tableHeader.element
                                                    ?.expression || ""
                                            }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="static-text">
                                            {{
                                                cell.content.tableHeader.element
                                                    ?.text || ""
                                            }}
                                        </div>
                                    </template>
                                </template>
                                <template v-else>
                                    <div class="static-text"></div>
                                </template>
                            </div>
                        </th>
                    </template>
                    <template v-else-if="type === 'columnHeader'">
                        <th
                            :class="[
                                'column-group-cell',
                                { 'column-selected': isCellSelected(cell) },
                            ]"
                            :colspan="cell.colspan"
                            :rowspan="cell.rowspan"
                            :style="getCellContainerStyle(cell, type)"
                            @click="handleCellClick(cell, $event)"
                            @contextmenu.stop="
                                handleCellContextMenu(cell, $event)
                            "
                        >
                            <div
                                class="cell-content"
                                :style="getCellContentStyle(cell, type)"
                            >
                                <template v-if="cell.content.columnHeader">
                                    <template
                                        v-if="
                                            cell.content.columnHeader.element
                                                ?.type === 'staticText'
                                        "
                                    >
                                        <div class="static-text">
                                            {{
                                                cell.content.columnHeader
                                                    .element?.text || ""
                                            }}
                                        </div>
                                    </template>
                                    <template
                                        v-else-if="
                                            cell.content.columnHeader.element
                                                ?.type === 'textField'
                                        "
                                    >
                                        <div class="text-field">
                                            {{
                                                cell.content.columnHeader
                                                    .element?.expression || ""
                                            }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="column-name">
                                            {{ cell.content.name }}
                                        </div>
                                    </template>
                                </template>
                                <template v-else>
                                    <div class="static-text"></div>
                                </template>
                            </div>
                        </th>
                    </template>
                    <template v-else-if="type === 'columnFooter'">
                        <th
                            :class="[
                                'column-group-cell',
                                { 'column-selected': isCellSelected(cell) },
                            ]"
                            :colspan="cell.colspan"
                            :rowspan="cell.rowspan"
                            :style="getCellContainerStyle(cell, type)"
                            @click="handleCellClick(cell, $event)"
                            @contextmenu.stop="
                                handleCellContextMenu(cell, $event)
                            "
                        >
                            <div
                                class="cell-content"
                                :style="getCellContentStyle(cell, type)"
                            >
                                <template v-if="cell.content.columnFooter">
                                    <template
                                        v-if="
                                            cell.content.columnFooter.element
                                                ?.type === 'staticText'
                                        "
                                    >
                                        <div class="static-text">
                                            {{
                                                cell.content.columnFooter
                                                    .element?.text || ""
                                            }}
                                        </div>
                                    </template>
                                    <template
                                        v-else-if="
                                            cell.content.columnFooter.element
                                                ?.type === 'textField'
                                        "
                                    >
                                        <div class="text-field">
                                            {{
                                                cell.content.columnFooter
                                                    .element?.expression || ""
                                            }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="static-text">
                                            {{
                                                cell.content.columnFooter
                                                    .element?.text || ""
                                            }}
                                        </div>
                                    </template>
                                </template>
                                <template v-else>
                                    <div class="static-text"></div>
                                </template>
                            </div>
                        </th>
                    </template>
                    <template v-else-if="type === 'tableFooter'">
                        <th
                            :class="[
                                'column-group-cell',
                                { 'column-selected': isCellSelected(cell) },
                            ]"
                            :colspan="cell.colspan"
                            :rowspan="cell.rowspan"
                            :style="getCellContainerStyle(cell, type)"
                            @click="handleCellClick(cell, $event)"
                            @contextmenu.stop="
                                handleCellContextMenu(cell, $event)
                            "
                        >
                            <div
                                class="cell-content"
                                :style="getCellContentStyle(cell, type)"
                            >
                                <template v-if="cell.content.tableFooter">
                                    <template
                                        v-if="
                                            cell.content.tableFooter.element
                                                ?.type === 'staticText'
                                        "
                                    >
                                        <div class="static-text">
                                            {{
                                                cell.content.tableFooter.element
                                                    ?.text || ""
                                            }}
                                        </div>
                                    </template>
                                    <template
                                        v-else-if="
                                            cell.content.tableFooter.element
                                                ?.type === 'textField'
                                        "
                                    >
                                        <div class="text-field">
                                            {{
                                                cell.content.tableFooter.element
                                                    ?.expression || ""
                                            }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="static-text">
                                            {{
                                                cell.content.tableFooter.element
                                                    ?.text || ""
                                            }}
                                        </div>
                                    </template>
                                </template>
                                <template v-else>
                                    <div class="static-text"></div>
                                </template>
                            </div>
                        </th>
                    </template>
                </template>
            </tr>
        </template>
    </template>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    group: any;
    level: number;
    type: "tableHeader" | "columnHeader" | "columnFooter" | "tableFooter";
    columns?: any[];
    reportStyles?: any[];
    tableStyles?: {
        tableHeader: string;
        columnHeader: string;
        columnFooter: string;
        detailCell: string;
    };
}>();

const emit = defineEmits<{
    columnClick: [column: any, event: MouseEvent, index?: number];
    columnContextMenu: [column: any, event: MouseEvent, index?: number];
    "row-resize-start": [
        info: {
            rowIndex: number;
            startY: number;
            originalHeight: number;
            type: string;
            rows: any[][];
        },
    ];
}>();

// Count the number of leaf nodes contained in each group (used to compute colspan)
function countLeafColumns(node: any): number {
    if (!node.children || node.children.length === 0) {
        return 1;
    }
    return node.children.reduce(
        (sum: number, child: any) => sum + countLeafColumns(child),
        0,
    );
}

// Compute the node's total width (used to set the cell width)
function calculateNodeWidth(node: any): number {
    if (!node.children || node.children.length === 0) {
        // Leaf node, return its own width
        return node.width || 0;
    }
    // Group node, sum the widths of all child nodes
    return node.children.reduce(
        (sum: number, child: any) => sum + calculateNodeWidth(child),
        0,
    );
}

// Compute the node's depth
function calculateNodeDepth(node: any, depth: number = 0): number {
    if (!node.children || node.children.length === 0) {
        return depth;
    }
    let maxDepth = depth;
    for (const child of node.children) {
        const childDepth = calculateNodeDepth(child, depth + 1);
        if (childDepth > maxDepth) {
            maxDepth = childDepth;
        }
    }
    return maxDepth;
}

// Get all leaf nodes
function getLeafNodes(node: any): any[] {
    const leaves: any[] = [];
    if (!node.children || node.children.length === 0) {
        leaves.push(node);
    } else {
        for (const child of node.children) {
            leaves.push(...getLeafNodes(child));
        }
    }
    return leaves;
}

// Build the group row data, correctly handling colspan and rowspan
function buildGroupRows(group: any): any[][] {
    console.log("group", group);
    // Get all leaf nodes
    const allLeaves = getLeafNodes(group);
    const totalColumns = allLeaves.length;

    // Compute the maximum depth across all nodes
    function getMaxDepth(nodes: any[]): number {
        let max = 0;
        for (const node of nodes) {
            const depth = calculateNodeDepth(node);
            if (depth > max) {
                max = depth;
            }
        }
        return max;
    }

    const maxDepth = getMaxDepth(group.children);

    // Create the row array
    const rows: any[][] = [];
    for (let i = 0; i <= maxDepth; i++) {
        rows[i] = [];
    }

    // Recursively build the table
    function buildTable(node: any, startColumn: number, depth: number) {
        // Compute the number of columns this node should span (colspan)
        const colspan = countLeafColumns(node);

        // Check whether the node has a corresponding header defined
        const hasHeader = node[props.type];

        // Compute the number of rows this node should span (rowspan)
        let rowspan: number;

        // Adjust the rendering logic based on the type
        if (props.type === "columnHeader") {
            // For Column Header, check whether columnHeader is actually defined
            if (node.children && node.children.length > 0) {
                if (hasHeader) {
                    // Has children and columnHeader is defined, render as a combined cell
                    rowspan = 1;
                } else {
                    // Has children but columnHeader isn't defined, don't create a cell, recurse into children directly
                    let currentColumn = startColumn;
                    for (const child of node.children) {
                        buildTable(child, currentColumn, depth);
                        currentColumn += countLeafColumns(child);
                    }
                    return;
                }
            } else {
                // Leaf node, rowspan is the number of rows from the current depth to the max depth
                rowspan = maxDepth - depth + 1;
            }
        } else if (props.type === "columnFooter") {
            // For Column Footer, check whether columnFooter is actually defined
            if (node.children && node.children.length > 0) {
                if (hasHeader) {
                    rowspan = 1;
                } else {
                    let currentColumn = startColumn;
                    for (const child of node.children) {
                        buildTable(child, currentColumn, depth);
                        currentColumn += countLeafColumns(child);
                    }
                    return;
                }
            } else {
                rowspan = maxDepth - depth + 1;
            }
        } else if (props.type === "tableFooter") {
            // For Table Footer, check whether tableFooter is actually defined
            if (node.children && node.children.length > 0) {
                if (hasHeader) {
                    rowspan = 1;
                } else {
                    let currentColumn = startColumn;
                    for (const child of node.children) {
                        buildTable(child, currentColumn, depth);
                        currentColumn += countLeafColumns(child);
                    }
                    return;
                }
            } else {
                rowspan = maxDepth - depth + 1;
            }
        } else {
            // For Table Header, check whether tableHeader is actually defined
            if (node.children && node.children.length > 0) {
                if (hasHeader) {
                    rowspan = 1;
                } else {
                    let currentColumn = startColumn;
                    for (const child of node.children) {
                        buildTable(child, currentColumn, depth);
                        currentColumn += countLeafColumns(child);
                    }
                    return;
                }
            } else {
                rowspan = maxDepth - depth + 1;
            }
        }

        // Create the cell
        const cell = {
            key: `${node.uuid || Math.random()}-${depth}-${startColumn}`,
            content: node,
            colspan,
            rowspan,
        };

        // Ensure the current row exists
        if (!rows[depth]) {
            rows[depth] = [];
        }

        // Add to the current row
        rows[depth].push(cell);

        // If there are children, continue recursing
        if (node.children && node.children.length > 0) {
            let currentColumn = startColumn;
            for (const child of node.children) {
                buildTable(child, currentColumn, depth + 1);
                currentColumn += countLeafColumns(child);
            }
        }
    }

    // Start building the table, processing all children of the root group
    let currentColumn = 0;
    for (const child of group.children) {
        buildTable(child, currentColumn, 0);
        currentColumn += countLeafColumns(child);
    }

    // Remove empty rows
    return rows.filter((row) => row.length > 0);
}

// Compute all group rows
const groupRows = computed(() => buildGroupRows(props.group));

// Compute the row height
function calculateRowHeight(row: any[]) {
    // Default row height
    let defaultHeight = 30;

    if (row && row.length > 0) {
        const firstCell = row[0];
        const cellContent = firstCell.content;

        // Get the corresponding height based on the type
        if (cellContent && cellContent[props.type]) {
            const cellHeight = cellContent[props.type].height || defaultHeight;
            const rowSpan = cellContent[props.type].rowSpan || 1;
            // For grouped cells with rowSpan > 1, UI should show single-row height
            return rowSpan > 1 ? Math.round(cellHeight / rowSpan) : cellHeight;
        }
    }

    // Set the default row height based on the type
    if (props.type === "tableHeader") {
        defaultHeight = 30;
    } else if (props.type === "columnHeader") {
        defaultHeight = 30;
    }

    return defaultHeight;
}

// Get the cell container style (applied to the th element)
function getCellContainerStyle(cell: any, type: string) {
    const content = cell.content;
    let element;
    if (type === "tableHeader" && content.tableHeader) {
        element = content.tableHeader;
    } else if (type === "columnHeader" && content.columnHeader) {
        element = content.columnHeader;
    }

    const styles: any = {
        padding: "0",
        margin: "0",
        boxSizing: "border-box",
    };

    // Compute and set the width based on the width defined in the JRXML
    const width = calculateNodeWidth(content);
    if (width > 0) {
        styles.width = `${width}px`;
    }

    if (element) {
        // Background color
        if (element.mode === "Opaque" && element.backcolor) {
            styles.backgroundColor = element.backcolor;
        }

        // Border style
        if (element.box && element.box.pen) {
            const pen = element.box.pen;
            if (pen.lineWidth && pen.lineWidth > 0) {
                styles.border = `${pen.lineWidth}px ${pen.lineStyle || "solid"} ${pen.lineColor || "#000000"}`;
            }
        } else if (element.borderWidth && element.borderWidth > 0) {
            styles.border = `${element.borderWidth}px solid #000000`;
        } else {
            styles.border = "1px solid #ccc";
        }
    } else {
        // Default style
        styles.backgroundColor = type === "tableHeader" ? "#FFFFFF" : "#FFFFFF";
        styles.border = "1px solid #ccc";
    }

    return styles;
}

// Get a style object by style name
function getStyleByName(styleName: string) {
    if (!props.reportStyles || !styleName) return null;
    return (
        props.reportStyles.find((style: any) => style.name === styleName) ||
        null
    );
}

// Convert a JRXML style to CSS style
function convertStyleToCSS(style: any) {
    if (!style) return {};

    const styles: any = {};

    // Text style
    if (style.fontSize) {
        styles.fontSize = `${style.fontSize}px`;
    }
    if (style.forecolor) {
        styles.color = style.forecolor;
    }
    if (style.isBold) {
        styles.fontWeight = "bold";
    }
    if (style.isItalic) {
        styles.fontStyle = "italic";
    }
    if (style.isUnderline) {
        styles.textDecoration = "underline";
    }
    if (style.mode === "Opaque" && style.backcolor) {
        styles.backgroundColor = style.backcolor;
    }

    // Text alignment
    if (style.textAlignment) {
        const align = style.textAlignment.toLowerCase();
        switch (align) {
            case "left":
                styles.justifyContent = "flex-start";
                break;
            case "center":
                styles.justifyContent = "center";
                break;
            case "right":
                styles.justifyContent = "flex-end";
                break;
            case "justified":
                styles.justifyContent = "space-between";
                break;
            default:
                styles.justifyContent = "center";
        }
    }
    // Vertical alignment
    if (style.verticalAlignment) {
        const align = style.verticalAlignment.toLowerCase();
        switch (align) {
            case "top":
                styles.alignItems = "flex-start";
                break;
            case "middle":
                styles.alignItems = "center";
                break;
            case "bottom":
                styles.alignItems = "flex-end";
                break;
            default:
                styles.alignItems = "center";
        }
    }

    // Border style
    let borderWidth = 0;
    let borderStyle = "solid";
    let borderColor = "#000000";

    if (style.box && style.box.pen) {
        borderWidth = style.box.pen.lineWidth || 0;
        borderStyle = style.box.pen.lineStyle || "solid";
        borderColor = style.box.pen.lineColor || "#000000";
    }

    if (borderWidth > 0) {
        styles.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }

    return styles;
}

// Get the row style
function getRowStyle(rowType: string) {
    // Get the style from tableStyles
    if (props.tableStyles) {
        let styleName = "";
        switch (rowType) {
            case "tableHeader":
                styleName = props.tableStyles.tableHeader;
                break;
            case "columnHeader":
                styleName = props.tableStyles.columnHeader;
                break;
        }

        if (styleName) {
            const style = getStyleByName(styleName);
            if (style) {
                return convertStyleToCSS(style);
            }
        }
    }
    return {};
}

// Get the cell content style (applied to the .cell-content element)
function getCellContentStyle(cell: any, type: string) {
    const content = cell.content;
    let element;
    if (type === "tableHeader" && content.tableHeader) {
        element = content.tableHeader;
    } else if (type === "columnHeader" && content.columnHeader) {
        element = content.columnHeader;
    }

    const styles: any = {
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "0 5px",
        boxSizing: "border-box",
    };

    if (element) {
        // Font style
        if (element.font) {
            if (element.font.isBold) {
                styles.fontWeight = "bold";
            }
            if (element.font.isItalic) {
                styles.fontStyle = "italic";
            }
            if (element.font.isUnderline) {
                styles.textDecoration = "underline";
            }
            if (element.font.size) {
                styles.fontSize = `${element.font.size}pt`;
            } else {
                // Default font size 10, consistent with JasperReport Studio
                styles.fontSize = "10px";
            }
        } else {
            // Compatible with the old format
            if (element.fontSize) {
                styles.fontSize = `${element.fontSize}px`;
            } else {
                // Default font size 10, consistent with JasperReport Studio
                styles.fontSize = "10px";
            }
            if (element.isBold) {
                styles.fontWeight = "bold";
            }
            if (element.isItalic) {
                styles.fontStyle = "italic";
            }
            if (element.isUnderline) {
                styles.textDecoration = "underline";
            }
        }

        // Text color
        if (element.forecolor) {
            styles.color = element.forecolor;
        }
        // Background color
        if (element.mode === "Opaque" && element.backcolor) {
            styles.backgroundColor = element.backcolor;
        }

        // Horizontal alignment
        if (element.textAlignment) {
            const align = element.textAlignment.toLowerCase();
            switch (align) {
                case "left":
                    styles.justifyContent = "flex-start";
                    break;
                case "right":
                    styles.justifyContent = "flex-end";
                    break;
                case "center":
                    styles.justifyContent = "center";
                    break;
                case "justified":
                    styles.justifyContent = "space-between";
                    break;
                default:
                    console.log("Unknown horizontal alignment:", align);
                    styles.justifyContent = "center";
            }
        } else {
            styles.justifyContent = "center";
        }

        // Vertical alignment
        if (element.verticalAlignment) {
            const align = element.verticalAlignment.toLowerCase();
            switch (align) {
                case "top":
                    styles.alignItems = "flex-start";
                    break;
                case "bottom":
                    styles.alignItems = "flex-end";
                    break;
                case "middle":
                    styles.alignItems = "center";
                    break;
                default:
                    styles.alignItems = "center";
            }
        } else {
            styles.alignItems = "center";
        }
    } else {
        // Default style
        styles.fontWeight = "600";
        styles.color = "#333";
        styles.justifyContent = "center";
        styles.alignItems = "center";
    }

    return styles;
}

function isCellSelected(cell: any): boolean {
    return false;
}

function handleCellClick(cell: any, event: MouseEvent) {
    if (!cell.content.children) {
        emit("columnClick", cell.content, event);
    }
    // Don't stop event propagation, let the event bubble up to the parent component
}

function handleCellContextMenu(cell: any, event: MouseEvent) {
    if (!cell.content.children) {
        emit("columnContextMenu", cell.content, event);
    }
}

// ===== Row height drag resize =====
function handleRowMouseDown(event: MouseEvent, rowIndex: number, row: any[]) {
    // Only trigger row-height dragging when clicking the ::after pseudo-element (i.e. the tr itself);
    // clicking th/td children is handled by element dragging and doesn't conflict
    if (event.target !== event.currentTarget) return;

    const tr = event.currentTarget as HTMLElement;
    const rect = tr.getBoundingClientRect();
    const distanceFromBottom = rect.bottom - event.clientY;

    if (distanceFromBottom <= 5) {
        const height = calculateRowHeight(row);
        emit("row-resize-start", {
            rowIndex,
            startY: event.clientY,
            originalHeight: height,
            type: props.type,
            rows: groupRows.value,
        });
        event.preventDefault();
        event.stopPropagation();
    }
}
</script>

<style scoped>
.column-group-row {
    /* Row height is determined by dynamic calculation; no hardcoded values are used */
    position: relative;
}

.column-group-row::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    cursor: ns-resize;
    z-index: 1;
}

.column-group-row:hover::after {
    background-color: rgba(64, 158, 255, 0.2);
}

.column-group-cell {
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
    padding: 0;
    margin: 0;
    border: 1px solid transparent;
}

.column-group-cell:hover {
    background-color: rgba(64, 158, 255, 0.1);
}

.column-selected {
    background-color: rgba(64, 158, 255, 0.15) !important;
    border: 1px solid rgba(64, 158, 255, 0.5) !important;
}

.cell-content {
    width: 100%;
    height: 100%;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    font-style: inherit;
    color: inherit;
}

.cell-content.empty {
    color: #999;
    font-style: italic;
}

.static-text,
.text-field,
.column-name {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    font-style: inherit;
    color: inherit;
}

.text-field {
    font-family: monospace;
}
</style>
