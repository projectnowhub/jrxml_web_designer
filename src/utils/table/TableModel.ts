import type { TableElement, Column, ColumnGroup, Cell } from '../../types/table';
import { TableUtils } from './ColumnFactory';

/**
 * Table model class, used to manage the state and operations of a table
 */
export class TableModel {
  private table: TableElement;

  constructor(table: TableElement) {
    this.table = table;
  }

  /**
   * Get the table element
   * @returns The table element
   */
  getTable(): TableElement {
    return this.table;
  }

  /**
   * Get all columns (including regular columns and column groups)
   * @returns Array of columns
   */
  getColumns(): (Column | ColumnGroup)[] {
    return this.table.children || this.table.columns || [];
  }

  /**
   * Set the columns array
   * @param columns Array of columns
   */
  setColumns(columns: (Column | ColumnGroup)[]): void {
    if (this.table.children) {
      this.table.children = columns;
    } else {
      this.table.columns = columns;
    }
    // Update the widths of all column groups
    TableUtils.updateAllColumnGroupWidths(columns);
  }

  /**
   * Add a column
   * @param column The column to add
   * @param index The insertion position, defaults to the end
   */
  addColumn(column: Column | ColumnGroup, index?: number): void {
    const columns = this.getColumns();
    const newColumns = TableUtils.addColumn(columns, column, index);
    this.setColumns(newColumns);
  }

  /**
   * Move a column
   * @param fromIndex The original index
   * @param toIndex The target index
   */
  moveColumn(fromIndex: number, toIndex: number): void {
    const columns = this.getColumns();
    const newColumns = TableUtils.moveColumn(columns, fromIndex, toIndex);
    this.setColumns(newColumns);
  }

  /**
   * Remove a column
   * @param uuid The UUID of the column to remove
   */
  removeColumn(uuid: string): void {
    const columns = this.getColumns();
    const newColumns = TableUtils.removeColumn(columns, uuid);
    this.setColumns(newColumns);
  }

  /**
   * Find a column by UUID
   * @param uuid The column's UUID
   * @returns The found column, or null if not found
   */
  findColumnByUuid(uuid: string): Column | ColumnGroup | null {
    const columns = this.getColumns();
    return TableUtils.findColumnByUuid(columns, uuid);
  }

  /**
   * Get all leaf columns
   * @returns Array of leaf columns
   */
  getLeafColumns(): Column[] {
    const columns = this.getColumns();
    return TableUtils.getLeafColumns(columns);
  }

  /**
   * Update a column's properties
   * @param uuid The column's UUID
   * @param updates The properties to update
   */
  updateColumn(uuid: string, updates: Partial<Column | ColumnGroup>): void {
    const column = this.findColumnByUuid(uuid);
    if (column) {
      Object.assign(column, updates);
      // If it's a column group, update its width
      if ('children' in column) {
        TableUtils.updateColumnGroupWidth(column);
        // Recursively update the parent column groups' widths
        this.updateParentColumnGroupWidths();
      } else {
        // If it's a regular column, update all parent column groups' widths
        this.updateParentColumnGroupWidths();
      }
    }
  }

  /**
   * Update a cell's properties
   * @param columnUuid The column's UUID
   * @param cellType The cell type
   * @param updates The properties to update
   */
  updateCell(columnUuid: string, cellType: keyof Pick<Column, 'tableHeader' | 'tableFooter' | 'columnHeader' | 'columnFooter' | 'detailCell'>,
    updates: Partial<Cell>): void {
    const column = this.findColumnByUuid(columnUuid);
    if (column) {
      // Check that detailCell only exists on the Column type
      if (cellType === 'detailCell' && 'children' in column) {
        // ColumnGroup has no detailCell property, return directly
        return;
      }

      // Type assertion to ensure the compiler understands we've handled the type difference
      const columnWithCell = column as Column;
      if (!columnWithCell[cellType]) {
        columnWithCell[cellType] = {};
      }
      Object.assign(columnWithCell[cellType], updates);
    }
  }

  /**
   * Recursively update the widths of all parent column groups
   */
  private updateParentColumnGroupWidths(): void {
    const columns = this.getColumns();
    TableUtils.updateAllColumnGroupWidths(columns);
  }

  /**
   * Compute the total width of the table
   * @returns The table's total width
   */
  calculateTotalWidth(): number {
    const columns = this.getColumns();
    return columns.reduce((sum, column) => {
      if ('children' in column) {
        return sum + column.width;
      } else {
        return sum + column.width;
      }
    }, 0);
  }

  /**
   * Update the table width to the actual sum of column widths
   */
  updateTableWidth(): void {
    this.table.width = this.calculateTotalWidth();
  }

  /**
   * Validate the table structure
   * @returns The validation result, including whether it's valid and any error messages
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const columns = this.getColumns();

    // Check whether there are any columns
    if (columns.length === 0) {
      errors.push('The table must have at least one column');
    }

    // Check column widths
    TableUtils.traverseColumns(columns, column => {
      if (column.width <= 0) {
        errors.push(`The width of column ${column.name} must be greater than 0`);
      }
    });

    // Check whether a column group's width matches the sum of its child columns' widths
    TableUtils.traverseColumns(columns, column => {
      if ('children' in column) {
        const calculatedWidth = TableUtils.calculateColumnGroupWidth(column);
        if (column.width !== calculatedWidth) {
          errors.push(`The width of column group ${column.name} does not match the sum of its child columns' widths`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone the table model
   * @returns The cloned table model
   */
  clone(): TableModel {
    const clonedTable = JSON.parse(JSON.stringify(this.table)) as TableElement;
    return new TableModel(clonedTable);
  }
}
