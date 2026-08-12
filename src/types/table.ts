// Table-related type definitions

// Base cell interface
export interface BaseCell {
  height?: number;
  width?: number;
  style?: string;
  mode?: string;
  backcolor?: string;
  forecolor?: string;
  textAlignment?: string;
  verticalAlignment?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  box?: {
    padding?: number;
    topPadding?: number;
    leftPadding?: number;
    bottomPadding?: number;
    rightPadding?: number;
    pen?: {
      lineWidth?: number;
      lineStyle?: string;
      lineColor?: string;
    };
    borderWidth?: number;
    borderStyle?: string;
    borderColor?: string;
  };
  element?: any; // The element inside the cell
}

// Cell interface
export interface Cell extends BaseCell {
  rowSpan?: number;
  enable?: boolean;
}

// Group cell interface
export interface GroupCell extends Cell {
  groupName: string;
}

// Base column interface
export interface BaseColumn {
  uuid: string;
  name: string;
  width: number;
  weight?: number;
  printWhenExpression?: string;
  tableHeader?: Cell;
  tableFooter?: Cell;
  groupHeaders?: GroupCell[];
  groupFooters?: GroupCell[];
  columnHeader?: Cell;
  columnFooter?: Cell;
  propertyExpressions?: any[];
  properties?: Record<string, string>;
}

// Regular column interface
export interface Column extends BaseColumn {
  detailCell?: Cell;
}

// Column group interface
export interface ColumnGroup extends BaseColumn {
  children: (Column | ColumnGroup)[];
}

// Table element interface
export interface TableElement {
  type: 'table';
  uuid: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns?: Column[];
  children?: (Column | ColumnGroup)[];
  styles?: {
    tableHeader?: string;
    columnHeader?: string;
    detail?: string;
    columnFooter?: string;
    tableFooter?: string;
  };
  whenNoDataType?: string;
  horizontalPosition?: string;
  shrinkWidth?: string;
  printOrder?: string;
  ignoreWidth?: string;
  dataset?: {
    name: string;
    uuid?: string;
    connectionExpression?: string;
    parameters?: any[];
  };
  tableHeader?: {
    height?: number;
    printWhenExpression?: string;
  };
  columnHeader?: {
    height?: number;
    printWhenExpression?: string;
  };
  groupHeaders?: {
    groupName: string;
    height?: number;
    printWhenExpression?: string;
  }[];
  detail?: {
    height?: number;
    printWhenExpression?: string;
  };
  groupFooters?: {
    groupName: string;
    height?: number;
    printWhenExpression?: string;
  }[];
  columnFooter?: {
    height?: number;
    printWhenExpression?: string;
  };
  tableFooter?: {
    height?: number;
    printWhenExpression?: string;
  };
  noData?: {
    height?: number;
    style?: string;
    elements?: any[];
  };
}

// Column visitor interface (for the visitor pattern)
export interface ColumnVisitor<T> {
  visitColumn(column: Column): T;
  visitColumnGroup(columnGroup: ColumnGroup): T;
}

// Column factory interface
export interface ColumnFactory {
  createColumn(column: any): Column;
  createColumnGroup(group: any): ColumnGroup;
  createColumns(columns: any[]): (Column | ColumnGroup)[];
}
