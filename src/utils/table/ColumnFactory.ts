import type { Column, ColumnGroup, BaseColumn } from '../../types/table';

/**
 * Column factory implementation class, used to create table column-related objects
 */
export class ColumnFactoryImpl {
  /**
   * Create a regular column
   * @param column Column configuration object
   * @returns The created column object
   */
  createColumn(column: any): Column {
    return {
      uuid: column.uuid || crypto.randomUUID(),
      name: column.name || `Column`,
      width: column.width || 100,
      weight: column.weight,
      printWhenExpression: column.printWhenExpression,
      tableHeader: column.tableHeader,
      tableFooter: column.tableFooter,
      groupHeaders: column.groupHeaders,
      groupFooters: column.groupFooters,
      columnHeader: column.columnHeader,
      columnFooter: column.columnFooter,
      detailCell: column.detailCell,
      propertyExpressions: column.propertyExpressions,
      properties: column.properties
    };
  }

  /**
   * Create a column group
   * @param group Column group configuration object
   * @returns The created column group object
   */
  createColumnGroup(group: any): ColumnGroup {
    const columnGroup: ColumnGroup = {
      uuid: group.uuid || crypto.randomUUID(),
      name: group.name || `Group`,
      width: group.width || this.calculateGroupWidth(group.children),
      weight: group.weight,
      printWhenExpression: group.printWhenExpression,
      tableHeader: group.tableHeader,
      tableFooter: group.tableFooter,
      groupHeaders: group.groupHeaders,
      groupFooters: group.groupFooters,
      columnHeader: group.columnHeader,
      columnFooter: group.columnFooter,
      propertyExpressions: group.propertyExpressions,
      properties: group.properties,
      children: []
    };

    // Recursively create child columns
    if (group.children) {
      columnGroup.children = this.createColumns(group.children);
    }

    return columnGroup;
  }

  /**
   * Create multiple columns in bulk
   * @param columns Array of column configuration objects
   * @returns Array of created column objects
   */
  createColumns(columns: any[]): (Column | ColumnGroup)[] {
    return columns.map(item => {
      if (item.children) {
        return this.createColumnGroup(item);
      } else {
        return this.createColumn(item);
      }
    });
  }

  /**
   * Compute the width of a column group
   * @param children Array of child columns
   * @returns The computed width
   */
  private calculateGroupWidth(children: any[]): number {
    if (!children || children.length === 0) {
      return 0;
    }

    return children.reduce((sum, child) => {
      if (child.children) {
        return sum + this.calculateGroupWidth(child.children);
      } else {
        return sum + (child.width || 0);
      }
    }, 0);
  }
}

/**
 * Table utility class, providing table-related operation methods
 */
export class TableUtils {
  private static columnFactory = new ColumnFactoryImpl();

  /**
   * Compute the width of a column group
   * @param columnGroup The column group
   * @returns The computed width
   */
  static calculateColumnGroupWidth(columnGroup: ColumnGroup): number {
    return columnGroup.children.reduce((sum, child) => {
      if ('children' in child) {
        return sum + this.calculateColumnGroupWidth(child);
      } else {
        return sum + child.width;
      }
    }, 0);
  }

  /**
   * Update the width of a column group
   * @param columnGroup The column group
   */
  static updateColumnGroupWidth(columnGroup: ColumnGroup): void {
    columnGroup.width = this.calculateColumnGroupWidth(columnGroup);
  }

  /**
   * Recursively update the widths of all column groups
   * @param columns Array of columns
   */
  static updateAllColumnGroupWidths(columns: (Column | ColumnGroup)[]): void {
    columns.forEach(column => {
      if ('children' in column) {
        this.updateAllColumnGroupWidths(column.children);
        this.updateColumnGroupWidth(column);
      }
    });
  }

  /**
   * Compute the number of leaf columns contained in a column group
   * @param columnGroup The column group
   * @returns The number of leaf columns
   */
  static countLeafColumns(columnGroup: ColumnGroup): number {
    return columnGroup.children.reduce((count, child) => {
      if ('children' in child) {
        return count + this.countLeafColumns(child);
      } else {
        return count + 1;
      }
    }, 0);
  }

  /**
   * Get all leaf columns
   * @param columns Array of columns
   * @returns Array of leaf columns
   */
  static getLeafColumns(columns: (Column | ColumnGroup)[]): Column[] {
    const leafColumns: Column[] = [];

    const collectLeafColumns = (items: (Column | ColumnGroup)[]) => {
      items.forEach(item => {
        if ('children' in item) {
          collectLeafColumns(item.children);
        } else {
          leafColumns.push(item);
        }
      });
    };

    collectLeafColumns(columns);
    return leafColumns;
  }

  /**
   * Depth-first traversal of the column structure
   * @param columns Array of columns
   * @param callback Callback function
   */
  static traverseColumns(columns: (Column | ColumnGroup)[], callback: (column: Column | ColumnGroup) => void): void {
    columns.forEach(column => {
      callback(column);
      if ('children' in column) {
        this.traverseColumns(column.children, callback);
      }
    });
  }

  /**
   * Find a column by UUID
   * @param columns Array of columns
   * @param uuid The column's UUID
   * @returns The found column, or null if not found
   */
  static findColumnByUuid(columns: (Column | ColumnGroup)[], uuid: string): Column | ColumnGroup | null {
    let found: Column | ColumnGroup | null = null;

    this.traverseColumns(columns, column => {
      if (column.uuid === uuid) {
        found = column;
      }
    });

    return found;
  }

  /**
   * Move a column
   * @param columns Array of columns
   * @param fromIndex The original index
   * @param toIndex The target index
   * @returns The array of columns after moving
   */
  static moveColumn(columns: (Column | ColumnGroup)[], fromIndex: number, toIndex: number): (Column | ColumnGroup)[] {
    if (fromIndex < 0 || fromIndex >= columns.length || toIndex < 0 || toIndex >= columns.length) {
      return columns;
    }

    const newColumns = [...columns];
    const movedColumn = newColumns.splice(fromIndex, 1)[0];
    if (movedColumn) {
      newColumns.splice(toIndex, 0, movedColumn);

      // Update the widths of the column groups
      this.updateAllColumnGroupWidths(newColumns);
    }

    return newColumns;
  }

  /**
   * Add a column
   * @param columns Array of columns
   * @param column The column to add
   * @param index The insertion position, defaults to the end
   * @returns The array of columns after adding
   */
  static addColumn(columns: (Column | ColumnGroup)[], column: Column | ColumnGroup, index?: number): (Column | ColumnGroup)[] {
    const newColumns = [...columns];
    if (index !== undefined && index >= 0 && index <= newColumns.length) {
      newColumns.splice(index, 0, column);
    } else {
      newColumns.push(column);
    }

    // Update the widths of the column groups
    this.updateAllColumnGroupWidths(newColumns);

    return newColumns;
  }

  /**
   * Remove a column
   * @param columns Array of columns
   * @param uuid The UUID of the column to remove
   * @returns The array of columns after removal
   */
  static removeColumn(columns: (Column | ColumnGroup)[], uuid: string): (Column | ColumnGroup)[] {
    const newColumns = [...columns];
    const index = newColumns.findIndex(column => column.uuid === uuid);

    if (index !== -1) {
      newColumns.splice(index, 1);
      // Update the widths of the column groups
      this.updateAllColumnGroupWidths(newColumns);
    } else {
      // Recursively find and remove the child column
      newColumns.forEach(column => {
        if ('children' in column) {
          column.children = this.removeColumn(column.children, uuid);
        }
      });
      // Update the widths of the column groups
      this.updateAllColumnGroupWidths(newColumns);
    }

    return newColumns;
  }
}
