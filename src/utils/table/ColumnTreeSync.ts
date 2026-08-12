import type {
  TableElement,
  Column,
  ColumnGroup,
  Cell,
} from "../../types/table";
import { TableUtils } from "./ColumnFactory";

/**
 * Sync the table's flat `columns` array with the `children` hierarchical structure.
 * `children` is the data source; `columns` is rebuilt from `children`.
 */
export function syncTableColumns(tableElement: TableElement): void {
  const children = tableElement.children || [];

  // Recursively update the widths of all column groups
  TableUtils.updateAllColumnGroupWidths(children);

  // Rebuild columns from children
  tableElement.columns = TableUtils.getLeafColumns(children);

  // Compute the maximum nesting depth and update the rowSpan of ungrouped root-level columns
  const maxDepth = calculateMaxDepth({ children });
  const requiredRowSpan = maxDepth;

  children.forEach((child) => {
    if (!("children" in child)) {
      // ungrouped root-level leaf column
      if (child.tableHeader) {
        child.tableHeader.rowSpan = requiredRowSpan;
        if (child.tableHeader.rowSpan > 1) {
          const singleRowHeight = getSingleRowHeight(child.tableHeader);
          child.tableHeader.height =
            singleRowHeight * child.tableHeader.rowSpan;
          if (child.tableHeader.element)
            child.tableHeader.element.height = child.tableHeader.height;
        }
      }
      if (child.columnHeader) {
        child.columnHeader.rowSpan = requiredRowSpan;
        if (child.columnHeader.rowSpan > 1) {
          const singleRowHeight = getSingleRowHeight(child.columnHeader);
          child.columnHeader.height =
            singleRowHeight * child.columnHeader.rowSpan;
          if (child.columnHeader.element)
            child.columnHeader.element.height = child.columnHeader.height;
        }
      }
      if (child.columnFooter) {
        child.columnFooter.rowSpan = requiredRowSpan;
        if (child.columnFooter.rowSpan > 1) {
          const singleRowHeight = getSingleRowHeight(child.columnFooter);
          child.columnFooter.height =
            singleRowHeight * child.columnFooter.rowSpan;
          if (child.columnFooter.element)
            child.columnFooter.element.height = child.columnFooter.height;
        }
      }
      if (child.tableFooter) {
        child.tableFooter.rowSpan = requiredRowSpan;
        if (child.tableFooter.rowSpan > 1) {
          const singleRowHeight = getSingleRowHeight(child.tableFooter);
          child.tableFooter.height =
            singleRowHeight * child.tableFooter.rowSpan;
          if (child.tableFooter.element)
            child.tableFooter.element.height = child.tableFooter.height;
        }
      }
    }
  });

  // Recursively process the rowSpan and height of standalone leaf columns nested inside groups
  inflateNestedStandaloneHeights(children, maxDepth, 0);

  // Update the table's total width
  tableElement.width = children.reduce((sum, c) => sum + c.width, 0);
}

/**
 * Recursively compute the maximum depth of the tree
 */
function calculateMaxDepth(
  node: { children?: (Column | ColumnGroup)[] },
  depth: number = 0,
): number {
  if (!node.children || node.children.length === 0) return depth;
  let maxDepth = depth;
  for (const child of node.children) {
    if ("children" in child) {
      const childDepth = calculateMaxDepth(child, depth + 1);
      if (childDepth > maxDepth) maxDepth = childDepth;
    }
  }
  return maxDepth;
}

/**
 * Create a default leaf column
 */
export function createDefaultColumn(name: string, width: number = 100): Column {
  return {
    uuid: crypto.randomUUID(),
    name,
    width,
    columnHeader: {
      enable: true,
      element: {
        type: "staticText",
        x: 0,
        y: 0,
        width,
        height: 30,
        text: name,
        textAlignment: "Center",
        verticalAlignment: "Middle",
      },
    },
    detailCell: {
      enable: true,
      element: {
        type: "textField",
        x: 0,
        y: 0,
        width,
        height: 30,
        expression: "",
        textAlignment: "Center",
        verticalAlignment: "Middle",
      },
    },
  };
}

/**
 * Create an empty column group (with no child columns)
 */
export function createDefaultColumnGroup(name: string): ColumnGroup {
  return {
    uuid: crypto.randomUUID(),
    name,
    width: 0,
    columnHeader: {
      enable: true,
      element: {
        type: "staticText",
        x: 0,
        y: 0,
        width: 0,
        height: 30,
        text: name,
        textAlignment: "Center",
        verticalAlignment: "Middle",
      },
    },
    children: [],
  };
}

/**
 * Find the array in the parent `children` structure that contains the target uuid, and return that array along with the target index.
 */
export function findInParentArray(
  children: (Column | ColumnGroup)[],
  targetUuid: string,
): { parent: (Column | ColumnGroup)[]; index: number } | null {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    if (child.uuid === targetUuid) {
      return { parent: children, index: i };
    }
    if ("children" in child) {
      const found = findInParentArray(
        (child as ColumnGroup).children,
        targetUuid,
      );
      if (found) return found;
    }
  }
  return null;
}

/**
 * Ungroup a column group: promote the group's child columns to the position the group occupied in the parent array
 */
export function ungroupColumnGroup(
  children: (Column | ColumnGroup)[],
  groupUuid: string,
): void {
  const result = findInParentArray(children, groupUuid);
  if (!result) return;

  const { parent, index } = result;
  const group = parent[index] as ColumnGroup;
  if (!("children" in group)) return;

  // Replace the group with its child columns
  parent.splice(index, 1, ...group.children);
}

/**
 * Extract the single-row height from a cell (if already inflated, divide by rowSpan to restore it; otherwise return the default value)
 */
function getSingleRowHeight(cell: Cell): number {
  const h = cell.height || (cell as any).element?.height || 30;
  const rs = cell.rowSpan || 1;
  if (rs <= 1) return h;
  // If the height equals the default value, it was never inflated, so return the default value directly
  if (h === 30) return 30;
  return Math.round(h / rs);
}

/**
 * Recursively process standalone leaf columns nested inside groups, setting rowSpan and inflating the height
 */
function inflateNestedStandaloneHeights(
  children: (Column | ColumnGroup)[],
  maxDepth: number,
  depth: number,
): void {
  for (const child of children) {
    if ("children" in child) {
      inflateNestedStandaloneHeights(
        (child as ColumnGroup).children,
        maxDepth,
        depth + 1,
      );
    } else {
      // Standalone leaf column
      const rowSpan = Math.max(1, maxDepth - depth + 1);
      if (child.tableHeader && rowSpan > 1) {
        child.tableHeader.rowSpan = rowSpan;
        const singleRowHeight = getSingleRowHeight(child.tableHeader);
        child.tableHeader.height = singleRowHeight * rowSpan;
        if (child.tableHeader.element)
          child.tableHeader.element.height = child.tableHeader.height;
      }
      if (child.columnHeader && rowSpan > 1) {
        child.columnHeader.rowSpan = rowSpan;
        const singleRowHeight = getSingleRowHeight(child.columnHeader);
        child.columnHeader.height = singleRowHeight * rowSpan;
        if (child.columnHeader.element)
          child.columnHeader.element.height = child.columnHeader.height;
      }
      if (child.columnFooter && rowSpan > 1) {
        child.columnFooter.rowSpan = rowSpan;
        const singleRowHeight = getSingleRowHeight(child.columnFooter);
        child.columnFooter.height = singleRowHeight * rowSpan;
        if (child.columnFooter.element)
          child.columnFooter.element.height = child.columnFooter.height;
      }
      if (child.tableFooter && rowSpan > 1) {
        child.tableFooter.rowSpan = rowSpan;
        const singleRowHeight = getSingleRowHeight(child.tableFooter);
        child.tableFooter.height = singleRowHeight * rowSpan;
        if (child.tableFooter.element)
          child.tableFooter.element.height = child.tableFooter.height;
      }
    }
  }
}
